(function exposeWheelLogic(global) {
  function normalizeRestaurant(value) {
    const rawName = typeof value === 'string' ? value.trim() : '';
    if (!rawName) return null;

    const isPrize = rawName.startsWith('A');
    const name = (isPrize ? rawName.slice(1) : rawName).trim();
    return name ? { name, isPrize } : null;
  }

  function chooseIndex(count, randomValue) {
    if (!Number.isInteger(count) || count < 1) return -1;
    const value = randomValue === undefined ? Math.random() : randomValue;
    return Math.min(count - 1, Math.floor(value * count));
  }

  function filterRestaurants(restaurants, selectedTags) {
    const tags = Array.isArray(selectedTags) ? selectedTags : [];
    return restaurants.filter((restaurant) =>
      tags.every((tag) => restaurant.tags?.[tag] === true)
    );
  }

  function enabledTagValue(value) {
    if (value === true || value === 1) return true;
    return typeof value === 'string' && ['1', 'true', 'yes', 'y', '是'].includes(value.trim().toLowerCase());
  }

  function restaurantDataFromRows(rows) {
    const sheetRows = Array.isArray(rows) ? rows : [];
    const header = Array.isArray(sheetRows[0]) ? sheetRows[0] : [];
    if (String(header[0] || '').trim() !== '餐厅') throw new Error('The first header must be: 餐厅');

    const columns = header.slice(1).reduce((result, value, offset) => {
      const tag = String(value || '').trim();
      if (tag && !/^列\d+$/u.test(tag)) result.push({ index: offset + 1, tag });
      return result;
    }, []);
    if (new Set(columns.map((column) => column.tag)).size !== columns.length) {
      throw new Error('Tag headers must be unique');
    }

    return {
      tags: columns.map((column) => column.tag),
      restaurants: sheetRows.slice(1).flatMap((row) => {
        const name = String(Array.isArray(row) ? row[0] || '' : '').trim();
        if (!name) return [];
        return [{
          name,
          tags: Object.fromEntries(columns.map((column) => [
            column.tag,
            enabledTagValue(row[column.index])
          ]))
        }];
      })
    };
  }

  function beijingDateKey(date) {
    const value = date instanceof Date ? date : new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(value);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  function normalizeDailyUsage(usage, date) {
    const day = beijingDateKey(date);
    if (!usage || typeof usage !== 'object' || usage.day !== day) {
      return { day, freeSpinUsed: false, extraSpins: 0, unlimited: false };
    }

    return {
      day,
      freeSpinUsed: usage.freeSpinUsed === true,
      extraSpins: Math.max(0, Number.isInteger(usage.extraSpins) ? usage.extraSpins : 0),
      unlimited: usage.unlimited === true
    };
  }

  function reserveSpin(usage, date) {
    const nextUsage = normalizeDailyUsage(usage, date);
    if (nextUsage.unlimited) return { allowed: true, usage: nextUsage };
    if (!nextUsage.freeSpinUsed) {
      return { allowed: true, usage: { ...nextUsage, freeSpinUsed: true } };
    }
    if (nextUsage.extraSpins > 0) {
      return { allowed: true, usage: { ...nextUsage, extraSpins: nextUsage.extraSpins - 1 } };
    }
    return { allowed: false, usage: nextUsage };
  }

  function grantOneExtraSpin(usage, date) {
    const nextUsage = normalizeDailyUsage(usage, date);
    return { ...nextUsage, extraSpins: nextUsage.extraSpins + 1 };
  }

  function grantUnlimitedSpins(usage, date) {
    return { ...normalizeDailyUsage(usage, date), unlimited: true };
  }

  function recordingFileName(date) {
    const value = date instanceof Date ? date : new Date();
    const pad = (number) => String(number).padStart(2, '0');
    const stamp = [
      value.getUTCFullYear(),
      pad(value.getUTCMonth() + 1),
      pad(value.getUTCDate())
    ].join('') + '-' + [
      pad(value.getUTCHours()),
      pad(value.getUTCMinutes()),
      pad(value.getUTCSeconds())
    ].join('');
    return `dinner-wheel-${stamp}.webm`;
  }

  function rotationForIndex(index, count, currentRotation) {
    if (!Number.isInteger(index) || index < 0 || index >= count || count < 1) {
      return currentRotation || 0;
    }

    const segmentAngle = 360 / count;
    const targetRotation = 360 - (index + 0.5) * segmentAngle;
    const previousRotation = currentRotation || 0;
    const normalizedRotation = ((previousRotation % 360) + 360) % 360;
    const adjustment = (targetRotation - normalizedRotation + 360) % 360;

    return previousRotation + 5 * 360 + adjustment;
  }

  const api = {
    beijingDateKey,
    chooseIndex,
    filterRestaurants,
    grantOneExtraSpin,
    grantUnlimitedSpins,
    normalizeDailyUsage,
    normalizeRestaurant,
    restaurantDataFromRows,
    recordingFileName,
    reserveSpin,
    rotationForIndex
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.WheelLogic = api;
})(typeof window !== 'undefined' ? window : undefined);
