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

  const api = { chooseIndex, normalizeRestaurant, recordingFileName, rotationForIndex };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global) global.WheelLogic = api;
})(typeof window !== 'undefined' ? window : undefined);
