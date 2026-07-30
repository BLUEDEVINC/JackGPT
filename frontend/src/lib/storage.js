/**
 * localStorage can throw (Safari private mode, disabled storage, quota).
 * These helpers keep such failures from breaking rendering while still logging them.
 */
export function getStoredItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`Unable to read '${key}' from localStorage`, err);
    return null;
  }
}

export function setStoredItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Unable to persist '${key}' to localStorage`, err);
    return false;
  }
}

export function removeStoredItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`Unable to remove '${key}' from localStorage`, err);
    return false;
  }
}
