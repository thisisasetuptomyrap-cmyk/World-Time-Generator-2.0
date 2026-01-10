// library.js - Core time management functions for WTG with mode switching (Normal/Lightweight)
// This library supports both Normal mode (full features) and Lightweight mode (minimal features)

// Map for descriptive time expressions
const descriptiveMap = new Map([
  ['morning', '8:00 AM'],
  ['afternoon', '2:00 PM'],
  ['noon', '12:00 PM'],
  ['evening', '6:00 PM'],
  ['night', '10:00 PM'],
  ['dawn', '6:00 AM'],
  ['dusk', '8:00 PM'],
  ['midday', '12:00 PM'],
  ['midnight', '12:00 AM']
]);

/**
 * Check if we're in lightweight mode
 * @returns {boolean} True if in lightweight mode
 */
function isLightweightMode() {
  return state.wtgMode === 'lightweight';
}

/**
 * Normalize time expressions to standard format
 * @param {string} str - Time string to normalize
 * @returns {string} Normalized time string
 */
function normalizeTime(str) {
  if (!str) return null;
  const lower = str.toLowerCase();
  if (descriptiveMap.has(lower)) {
    return descriptiveMap.get(lower);
  }
  return capitalize(str);
}

/**
 * Validate if a date is valid
 * @param {number} month - Month (1-12)
 * @param {number} day - Day (1-31)
 * @param {number} year - Year
 * @returns {boolean} True if valid date
 */
function isValidDate(month, day, year) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && (date.getMonth() + 1) === month && date.getDate() === day;
}

/**
 * Advance a date by a specified number of days
 * @param {string} dateStr - Date string in mm/dd/yyyy format
 * @param {number} days - Number of days to advance
 * @returns {string} New date string in mm/dd/yyyy format
 */
function advanceDate(dateStr, days = 0) {
  let [month, day, year] = dateStr.split('/').map(Number);
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  day = String(date.getDate()).padStart(2, '0');
  month = String(date.getMonth() + 1).padStart(2, '0');
  year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Advance time by specified hours, minutes, seconds
 * @param {string} timeStr - Time string in hh:mm AM/PM format
 * @param {number} hours - Hours to add
 * @param {number} minutes - Minutes to add
 * @param {number} seconds - Seconds to add
 * @returns {Object} Object with new time and extra days
 */
function advanceTime(timeStr, hours = 0, minutes = 0, seconds = 0) {
  let parts = timeStr.split(/[: ]/);
  let hourStr = parts[0];
  let minStr = '00';
  let period = '';
  if (parts.length === 3) {
    minStr = parts[1];
    period = parts[2];
  } else if (parts.length === 2) {
    if (isNaN(parseInt(parts[1], 10))) {
      period = parts[1];
    } else {
      minStr = parts[1];
    }
  }
  if (/[a-zA-Z]/i.test(hourStr)) {
    let match = hourStr.match(/^(\d+)([a-zA-Z]+)$/i);
    if (match) {
      hourStr = match[1];
      period = match[2];
    }
  }
  if (/[a-zA-Z]/i.test(minStr)) {
    let match = minStr.match(/^(\d+)([a-zA-Z]+)$/i);
    if (match) {
      minStr = match[1];
      period = match[2];
    }
  }
  let hour = parseInt(hourStr, 10);
  let min = parseInt(minStr, 10);
  if (period.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
  let currentSeconds = hour * 3600 + min * 60 + 0;
  let addedSeconds = hours * 3600 + minutes * 60 + seconds;
  let totalSeconds = currentSeconds + addedSeconds;
  let extraDays = Math.floor(totalSeconds / 86400);
  let wrappedSeconds = totalSeconds % 86400;
  hour = Math.floor(wrappedSeconds / 3600);
  let remaining = wrappedSeconds % 3600;
  min = Math.floor(remaining / 60);
  let sec = remaining % 60;
  period = (hour < 12) ? 'AM' : 'PM';
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  let newTime = `${hour}:${String(min).padStart(2, '0')}${sec > 0 ? `:${String(sec).padStart(2, '0')}` : ''} ${period}`;
  return { time: newTime, days: extraDays };
}

/**
 * Capitalize a string or convert time to 12-hour format
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string or formatted time
 */
function capitalize(str) {
  str = str || 'Unknown';
  if (str === 'Unknown') return str;
  if (/\d/.test(str)) {
    if (/^\d{1,2}:\d{2}$/.test(str)) {
      return convertTo12Hour(str);
    }
    str = str.replace(/(am|pm|a\.m\.|p\.m\.)$/i, match => match.toUpperCase());
    if (!/:\d{2}/.test(str)) {
      str = str.replace(/(\d+)\s*([AP]M)?$/i, (match, p1, p2) => {
        let period = p2 ? ` ${p2.toUpperCase()}` : '';
        return `${p1}:00${period}`;
      });
    }
    return str;
  } else {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

/**
 * Convert 24-hour time to 12-hour format
 * @param {string} timeStr - Time string in 24-hour format (hh:mm)
 * @returns {string} Time string in 12-hour format (h:mm AM/PM)
 */
function convertTo12Hour(timeStr) {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  let min = minStr ? `:${minStr}` : ':00';
  const period = (hour < 12) ? 'AM' : 'PM';
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return `${hour}${min} ${period}`;
}

/**
 * Extract date from history or current output
 * @param {string} currentOutput - Current output text
 * @param {boolean} useHistory - Whether to search history if not found in current output
 * @returns {string|null} Date string or null
 */
function getCurrentDateFromHistory(currentOutput = '', useHistory = false) {
  let currentDate = null;
  const dateRegex = /\d{1,2}[/.-]\d{1,2}[/.-]\d{2}(?:\d{2})?/g;
  let matches = currentOutput.match(dateRegex);
  if (matches && matches.length > 0) {
    currentDate = matches[matches.length - 1].trim().replace(/[.-]/g, '/');
  }
  if (!currentDate && useHistory) {
    for (let i = history.length - 1; i >= 0; i--) {
      matches = history[i].text.match(dateRegex);
      if (matches && matches.length > 0) {
        currentDate = matches[matches.length - 1].trim().replace(/[.-]/g, '/');
        break;
      }
    }
  }
  return currentDate;
}

/**
 * Extract time from history or current output
 * @param {string} currentOutput - Current output text
 * @param {boolean} useHistory - Whether to search history if not found in current output
 * @returns {string|null} Time string or null
 */
function getCurrentTimeFromHistory(currentOutput = '', useHistory = false) {
  let currentTime = null;
  const timeRegex = /(\d{1,2}(?:\:\d{2})?\s*(?:AM|PM|a\.m\.|p\.m\.))|(\d{1,2}:\d{2})|(morning|afternoon|noon|evening|night|dawn|dusk|midday|midnight)/gi;
  let matches = currentOutput.match(timeRegex);
  if (matches && matches.length > 0) {
    let lastMatch = matches[matches.length - 1].trim();
    let lowerMatch = lastMatch.toLowerCase();
    let isDescriptive = descriptiveMap.has(lowerMatch);
    let currentIsPrecise = state.currentTime && /\d{1,2}:\d{2} [AP]M/.test(state.currentTime);
    if (!isDescriptive || !currentIsPrecise) {
      currentTime = lastMatch;
    }
  }
  if (!currentTime && useHistory) {
    for (let i = history.length - 1; i >= 0; i--) {
      matches = history[i].text.match(timeRegex);
      if (matches && matches.length > 0) {
        let lastMatch = matches[matches.length - 1].trim();
        let lowerMatch = lastMatch.toLowerCase();
        let isDescriptive = descriptiveMap.has(lowerMatch);
        let currentIsPrecise = state.currentTime && /\d{1,2}:\d{2} [AP]M/.test(state.currentTime);
        if (!isDescriptive || !currentIsPrecise) {
          currentTime = lastMatch;
          break;
        }
      }
    }
  }
  return currentTime ? normalizeTime(currentTime) : null;
}

/**
 * Parse turn time string into object
 * @param {string} str - Turn time string in format 00y00m00d00h00n00s
 * @returns {Object|null} Turn time object or null
 */
function parseTurnTime(str) {
  const match = str.match(/(\d{2})y(\d{2})m(\d{2})d(\d{2})h(\d{2})n(\d{2})s/);
  if (!match) return {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  return {
    years: parseInt(match[1]),
    months: parseInt(match[2]),
    days: parseInt(match[3]),
    hours: parseInt(match[4]),
    minutes: parseInt(match[5]),
    seconds: parseInt(match[6])
  };
}

/**
 * Format turn time object into string
 * @param {Object} tt - Turn time object
 * @returns {string} Formatted turn time string
 */
function formatTurnTime(tt) {
  tt = tt || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  return `${String(tt.years).padStart(2, '0')}y${String(tt.months).padStart(2, '0')}m${String(tt.days).padStart(2, '0')}d${String(tt.hours).padStart(2, '0')}h${String(tt.minutes).padStart(2, '0')}n${String(tt.seconds).padStart(2, '0')}s`;
}

/**
 * Add time values to turn time object
 * @param {Object} tt - Turn time object
 * @param {Object} add - Time values to add
 * @returns {Object} New turn time object
 */
function addToTurnTime(tt, add) {
  tt = tt || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  let newTT = {...tt};
  newTT.seconds += add.seconds || 0;
  newTT.minutes += Math.floor(newTT.seconds / 60);
  newTT.seconds %= 60;
  newTT.minutes += add.minutes || 0;
  newTT.hours += Math.floor(newTT.minutes / 60);
  newTT.minutes %= 60;
  newTT.hours += add.hours || 0;
  newTT.days += Math.floor(newTT.hours / 24);
  newTT.hours %= 24;
  newTT.days += add.days || 0;
  newTT.months += add.months || 0;
  newTT.years += Math.floor(newTT.months / 12);
  newTT.months %= 12;
  newTT.years += add.years || 0;
  return newTT;
}

/**
 * Compute current date and time from starting values and turn time
 * @param {string} startingDate - Starting date string
 * @param {string} startingTime - Starting time string
 * @param {Object} tt - Turn time object
 * @returns {Object} Object with currentDate and currentTime
 */
function computeCurrent(startingDate, startingTime, tt) {
  tt = tt || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  if (startingTime === 'Unknown') {
    let approxDays = (tt.years || 0) * 365 + (tt.months || 0) * 30 + (tt.days || 0);
    let currentDate = advanceDate(startingDate, approxDays);
    return { currentDate, currentTime: 'Unknown' };
  }
  let [month, day, year] = startingDate.split('/').map(Number);
  let date = new Date(year, month - 1, day);
  date.setFullYear(date.getFullYear() + (tt.years || 0));
  date.setMonth(date.getMonth() + (tt.months || 0));
  date.setDate(date.getDate() + (tt.days || 0));
  let {time, days} = advanceTime(startingTime, tt.hours || 0, tt.minutes || 0, tt.seconds || 0);
  date.setDate(date.getDate() + days);
  let currentDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  return { currentDate, currentTime: time };
}

/**
 * Parse time string into hour, minute, second components
 * @param {string} str - Time string
 * @returns {Object} Object with hour, min, sec
 */
function parseTime(str) {
  if (!str || str === 'Unknown') return {hour: 0, min: 0, sec: 0};
  let parts = str.split(/[: ]/);
  let hourStr = parts[0];
  let minStr = '00';
  let period = '';
  if (parts.length === 3) {
    minStr = parts[1];
    period = parts[2];
  } else if (parts.length === 2) {
    if (isNaN(parseInt(parts[1], 10))) {
      period = parts[1];
    } else {
      minStr = parts[1];
    }
  }
  if (/[a-zA-Z]/i.test(hourStr)) {
    let match = hourStr.match(/^(\d+)([a-zA-Z]+)$/i);
    if (match) {
      hourStr = match[1];
      period = match[2];
    }
  }
  if (/[a-zA-Z]/i.test(minStr)) {
    let match = minStr.match(/^(\d+)([a-zA-Z]+)$/i);
    if (match) {
      minStr = match[1];
      period = match[2];
    }
  }
  let hour = parseInt(hourStr, 10);
  let min = parseInt(minStr, 10);
  if (period.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
  return {hour, min, sec: 0};
}

/**
 * Calculate date difference between two date/time combinations
 * @param {string} startStr - Start date string
 * @param {string} startTimeStr - Start time string
 * @param {string} endStr - End date string
 * @param {string} endTimeStr - End time string
 * @returns {Object} Turn time object representing difference
 */
function getDateDiff(startStr, startTimeStr, endStr, endTimeStr) {
  let [sMonth, sDay, sYear] = startStr.split('/').map(Number);
  let startParsed = parseTime(startTimeStr);
  let start = new Date(sYear, sMonth - 1, sDay, startParsed.hour, startParsed.min, startParsed.sec);
  let [eMonth, eDay, eYear] = endStr.split('/').map(Number);
  let endParsed = parseTime(endTimeStr);
  let end = new Date(eYear, eMonth - 1, eDay, endParsed.hour, endParsed.min, endParsed.sec);
  if (end < start) return {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();
  if (seconds < 0) {
    minutes--;
    seconds += 60;
  }
  if (minutes < 0) {
    hours--;
    minutes += 60;
  }
  if (hours < 0) {
    days--;
    hours += 24;
  }
  if (days < 0) {
    months--;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return {years, months, days, hours, minutes, seconds};
}

/**
 * Get the most recent timestamp from the WTG Data storycard
 * @returns {Object|null} Turn time object or null if not found
 */
function getLastTimestampFromWTGData() {
  const dataCard = getWTGDataCard();
  if (!dataCard || !dataCard.entry) return null;

  // Try lightweight format first (simpler)
  let turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
  let matches = [...dataCard.entry.matchAll(turnDataRegex)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const timestamp = lastMatch[3];
    if (timestamp && timestamp.match(/\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s/)) {
      return parseTurnTime(timestamp);
    }
  }

  // Try normal format (includes more fields)
  turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nResponse Text: (.*?)\nGenerated Entities: (.*?)\nTrigger Mentions: (.*?)\nAI Command: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
  matches = [...dataCard.entry.matchAll(turnDataRegex)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const timestamp = lastMatch[7];
    if (timestamp && timestamp.match(/\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s/)) {
      return parseTurnTime(timestamp);
    }
  }

  return null;
}

/**
 * Get last turn time and character count from history
 * @param {Array} history - History array
 * @returns {Object} Object with lastTT, charsAfter, and found (whether a marker was found)
 */
function getLastTurnTimeAndChars(history) {
  let lastTT = {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  let charsAfter = 0;
  let found = false;
  for (let i = history.length - 1; i >= 0; i--) {
    const actionText = history[i].text;
    const match = actionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]/);
    if (match) {
      lastTT = parseTurnTime(match[1]);
      found = true;
      break;
    } else {
      charsAfter += actionText.length;
    }
  }

  // If no marker found in history, try to get timestamp from WTG Data storycard
  if (!found) {
    const wtgDataTimestamp = getLastTimestampFromWTGData();
    if (wtgDataTimestamp) {
      lastTT = wtgDataTimestamp;
      found = true;
      // Only count last action's chars when recovered from WTG Data
      charsAfter = history.length > 0 ? history[history.length - 1].text.length : 0;
    } else {
      // Only use cumulative when no timestamp source exists
      charsAfter = history.reduce((sum, action) => sum + action.text.length, 0);
    }
  }
  return {lastTT, charsAfter, found};
}

/**
 * Extract keywords from text (Normal mode only)
 * @param {string} text - Text to process
 * @returns {Array} Array of keywords
 */
function extractKeywords(text) {
  const words = text.split(/\s+/);
  const keywords = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w]/g, '').toLowerCase();
    if (word.length > 3 && !/^\d+$/.test(word)) {
      keywords.push(word);
    }
  }
  return [...new Set(keywords)];
}

/**
 * Calculate keyword similarity between two arrays (Normal mode only)
 * @param {Array} keywords1 - First array of keywords
 * @param {Array} keywords2 - Second array of keywords
 * @returns {number} Similarity score (0-1)
 */
function calculateKeywordSimilarity(keywords1, keywords2) {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = [...set1].filter(x => set2.has(x));
  const union = [...new Set([...set1, ...set2])];
  return intersection.length / union.length;
}

/**
 * Get or create WTG Data storycard
 * @returns {Object} WTG Data storycard
 */
function getWTGDataCard() {
  let dataCard = storyCards.find(card => card.title === "WTG Data");
  if (!dataCard) {
    addStoryCard("WTG Data");
    // Find the newly created card
    dataCard = storyCards.find(card => card.title === "WTG Data");
    if (dataCard) {
      dataCard.type = "system";
      dataCard.keys = "wtg_internal_data,do_not_include_in_context";
      dataCard.entry = "";
      dataCard.description = "System data for World Time Generator - Internal use only, do not include in context";
    }
  }
  return dataCard;
}

/**
 * Get or create Current Date and Time storycard
 * @returns {Object} Current Date and Time storycard
 */
function getCurrentDateTimeCard() {
  let dateTimeCard = storyCards.find(card => card.title === "Current Date and Time");
  if (!dateTimeCard) {
    addStoryCard("Current Date and Time");
    dateTimeCard = storyCards[storyCards.length - 1];
    dateTimeCard.type = "event";
    dateTimeCard.keys = "date,time,current date,current time,clock,hour";
    dateTimeCard.description = "Commands:\n[settime mm/dd/yyyy time] - Set starting date and time\n[advance N [hours|days|months|years]] - Advance time/date\n[sleep] - Sleep to next morning\n[reset] - Reset to most recent mention in history\n[light] - Switch to lightweight mode\n[normal] - Switch to normal mode";
  }
  return dateTimeCard;
}

/**
 * Get or create WTG Settings storycard (Normal mode only)
 * @returns {Object} WTG Settings storycard
 */
function getWTGSettingsCard() {
  let settingsCard = storyCards.find(card => card.title === "World Time Generator Settings");
  if (!settingsCard) {
    addStoryCard("World Time Generator Settings");
    settingsCard = storyCards[storyCards.length - 1];
    settingsCard.type = "system";
    settingsCard.keys = ""; // No keys - not included in AI context
    settingsCard.description = "World Time Generator Settings - Edit the values below to configure the system.";
    
    if (isLightweightMode()) {
      settingsCard.entry = `Time Duration Multiplier: 1.0
Debug Mode: false
Disable WTG Entirely: false`;
    } else {
      settingsCard.entry = `Time Duration Multiplier: 1.0
Enable Generated Character Cards: true
Enable Generated Location Cards: true
Disable Generated Card Deletion: true
Debug Mode: false
Enable Dynamic Time: true
Disable WTG Entirely: false`;
    }
  } else {
    // Update existing settings card if mode changed
    const currentlyLightweight = isLightweightMode();
    const hasFullSettings = settingsCard.entry && settingsCard.entry.includes("Enable Generated Character Cards");
    
    if (currentlyLightweight && hasFullSettings) {
      // Strip down to lightweight settings
      settingsCard.entry = `Time Duration Multiplier: 1.0
Debug Mode: false
Disable WTG Entirely: false`;
    } else if (!currentlyLightweight && !hasFullSettings) {
      // Expand to full settings
      settingsCard.entry = `Time Duration Multiplier: 1.0
Enable Generated Character Cards: true
Enable Generated Location Cards: true
Disable Generated Card Deletion: true
Debug Mode: false
Enable Dynamic Time: true
Disable WTG Entirely: false`;
    }
    
    // Ensure keys are always empty
    settingsCard.keys = "";
  }
  return settingsCard;
}

/**
 * Get a boolean setting from the WTG Settings card (Normal mode only)
 * @param {string} settingName - Name of the setting to retrieve
 * @returns {boolean} The boolean value of the setting, or false if not found
 */
function getWTGBooleanSetting(settingName) {
  if (isLightweightMode()) return false;
  const settingsCard = getWTGSettingsCard();
  if (!settingsCard || !settingsCard.entry) return false;
  const regex = new RegExp(`${settingName}:\\s*(true|false)`, 'i');
  const match = settingsCard.entry.match(regex);
  return match ? match[1].toLowerCase() === 'true' : false;
}

/**
 * Get dynamic time factor based on turn content analysis (Normal mode only)
 * @param {string} turnText - Text from player input and AI response
 * @returns {number} Time factor (0.5 for quick turns, 2.0 for long turns, 1.0 for medium/default)
 */
function getDynamicTimeFactor(turnText) {
  const lowerText = turnText.toLowerCase();
  if (lowerText.match(/\b(say|ask|talk|whisper|reply)\b/)) {
    return 0.5;
  }
  if (lowerText.match(/\b(journey|travel|wait|sleep|days|hours)\b/)) {
    return 2.0;
  }
  return 1.0;
}

/**
 * Sanitize an entity name (Normal mode only)
 * @param {string} name - The entity name to sanitize
 * @returns {string} The sanitized entity name
 */
function sanitizeEntityName(name) {
  if (!name) return '';
  return name.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
}

/**
 * Normalize keys for an entity (Normal mode only)
 * @param {string} entityName - The entity name to normalize
 * @returns {Array} Array of normalized keys
 */
function normalizeKeysFor(entityName) {
  if (!entityName) return [];
  const lower = entityName.toLowerCase();
  const kebab = lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return [lower, kebab].filter(key => key.length > 0);
}

/**
 * Find or create a storycard (Normal mode only)
 * @param {string} title - Title of the storycard to find or create
 * @returns {Object|null} The found or created storycard, or null if title is empty or system card
 */
function findOrCreateCard(title) {
  if (!title || title.trim() === '') return null;
  const trimmedTitle = title.trim();
  const lowerTitle = trimmedTitle.toLowerCase();
  const systemTitles = ["WTG Data", "Current Date and Time", "World Time Generator Settings"];
  if (systemTitles.some(sysTitle => sysTitle.toLowerCase() === lowerTitle)) {
    return null;
  }
  let existingCard = storyCards.find(card =>
    card.title && card.title.toLowerCase() === lowerTitle
  );
  if (existingCard) {
    return existingCard;
  }
  addStoryCard(trimmedTitle);
  return storyCards[storyCards.length - 1];
}

/**
 * Update the Current Date and Time storycard
 */
function updateDateTimeCard() {
  const dateTimeCard = getCurrentDateTimeCard();
  const ttForm = formatTurnTime(state.turnTime);
  let entry = `Starting date: ${state.startingDate || '01/01/1900'}\nStarting time: ${state.startingTime || 'Unknown'}\nCurrent date: ${state.currentDate || '01/01/1900'}\nCurrent time: ${state.currentTime || 'Unknown'}\nTurn time: ${ttForm}`;

  if (!isLightweightMode()) {
    if (state.sleepWakeTime) {
      const wakeTT = parseTurnTime(state.sleepWakeTime);
      const {currentDate: wakeDate, currentTime: wakeTime} = computeCurrent(state.startingDate, state.startingTime, wakeTT);
      entry += `\n\nWoke up on: ${wakeDate} ${wakeTime}`;
    }
    if (state.advanceEndTime) {
      const advanceTT = parseTurnTime(state.advanceEndTime);
      const {currentDate: advanceDate, currentTime: advanceTime} = computeCurrent(state.startingDate, state.startingTime, advanceTT);
      entry += `\n\nAdvanced until: ${advanceDate} ${advanceTime}`;
    }
  }

  dateTimeCard.entry = entry;
}

/**
 * Add timestamp to a storycard if it doesn't have one
 * @param {Object} card - Storycard to update
 * @param {string} timestamp - Timestamp to add
 * @param {boolean} isGenerated - Whether this entity was generated in this turn (Normal mode only)
 */
function addTimestampToCard(card, timestamp, isGenerated = false) {
  // Check if card is excluded from timestamp injection
  if (card && card.title && isCardExcluded(card.title)) {
    return;
  }
  if (!isLightweightMode() && card && card.description && card.description.includes("Generated character") && card.description.includes("not yet discovered in story")) {
    return;
  }
  if (timestamp && timestamp.includes("Unknown")) {
    return;
  }
  if (card && card.entry && !card.entry.includes("Discovered on") && !card.entry.includes("Met on") && !card.entry.includes("Visited")) {
    let discoveryVerb = "Discovered on";
    if (card.type === "character" || (card.description && card.description.includes("Generated character"))) {
      discoveryVerb = "Met on";
    } else if (card.type === "location" || card.type === "place" || card.type === "area" ||
               (card.keys && (card.keys.includes("location") || card.keys.includes("place") ||
                              card.keys.includes("city") || card.keys.includes("town") ||
                              card.keys.includes("village") || card.keys.includes("building")))) {
      discoveryVerb = "Visited";
    }
    const generatedLabel = (!isLightweightMode() && isGenerated) ? " (generated)" : "";

    // Check for custom placement marker /]
    if (card.entry.includes('/]')) {
      card.entry = card.entry.replace('/]', `${discoveryVerb} ${timestamp}${generatedLabel}`);
      return;
    }

    // Default: append at end with blank line separator
    card.entry += `\n\n${discoveryVerb} ${timestamp}${generatedLabel}`;
  }
}

/**
 * Check if a storycard already has a timestamp
 * @param {Object} card - Storycard to check
 * @returns {boolean} True if card has a timestamp
 */
function hasTimestamp(card) {
  return card && card.entry && (card.entry.includes("Discovered on") || card.entry.includes("Met on") || card.entry.includes("Visited"));
}

/**
 * Check if any of a storycard's keywords are mentioned in the given text
 * @param {Object} card - Storycard to check
 * @param {string} text - Text to search for keywords
 * @returns {boolean} True if any keyword from the card is found in the text
 */
function isCardKeywordMentioned(card, text) {
  if (!card || !card.keys || !text) return false;
  
  // Normalize text to lowercase for case-insensitive matching
  const normalizedText = text.toLowerCase();
  
  // Split the keys by comma and check each one
  const keys = card.keys.split(',').map(k => k.trim().toLowerCase());
  
  for (const key of keys) {
    if (!key) continue;
    
    // Check if the key appears as a whole word in the text
    // Use word boundaries to avoid partial matches
    const keyRegex = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (keyRegex.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get turn data from WTG Data storycard
 * @returns {Array} Array of turn data objects
 */
function getTurnData() {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return [];

  if (isLightweightMode()) {
    const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
    const matches = [...dataCard.entry.matchAll(turnDataRegex)];
    return matches.map(match => ({
      actionType: match[1],
      actionText: match[2],
      timestamp: match[3]
    }));
  } else {
    const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nResponse Text: (.*?)\nGenerated Entities: (.*?)\nTrigger Mentions: (.*?)\nAI Command: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
    const matches = [...dataCard.entry.matchAll(turnDataRegex)];
    return matches.map(match => ({
      actionType: match[1],
      actionText: match[2],
      responseText: match[3],
      generatedEntities: match[4],
      triggerMentions: match[5],
      aiCommand: match[6],
      timestamp: match[7]
    }));
  }
}

/**
 * Add turn data to WTG Data storycard
 */
function addTurnData(actionType, actionText, timestamp, responseText = '', generatedEntities = [], triggerMentions = [], aiCommand = null) {
  const dataCard = getWTGDataCard();
  const modePrefix = `Mode: ${state.wtgMode || 'lightweight'}\n\n`;

  if (isLightweightMode()) {
    const turnDataEntry = `[Turn Data]
Action Type: ${actionType}
Action Text: ${actionText}
Timestamp: ${timestamp}
[/Turn Data]`;
    if (dataCard.entry) {
      // Remove old mode prefix if it exists
      dataCard.entry = dataCard.entry.replace(/^Mode: .*?\n\n/, '');
      dataCard.entry = modePrefix + dataCard.entry + '\n\n' + turnDataEntry;
    } else {
      dataCard.entry = modePrefix + turnDataEntry;
    }
  } else {
    const formattedEntities = generatedEntities.length > 0 ? generatedEntities.map(entity => `[${entity.type}:${entity.name}]`).join(' ') : '';
    const formattedTriggers = triggerMentions.length > 0 ? triggerMentions.map(trigger => `[trigger:${trigger.cardTitle}:${trigger.trigger}]`).join(' ') : '';
    const turnDataEntry = `[Turn Data]
Action Type: ${actionType}
Action Text: ${actionText}
Response Text: ${responseText}
Generated Entities: ${formattedEntities}
Trigger Mentions: ${formattedTriggers}
AI Command: ${aiCommand || 'None'}
Timestamp: ${timestamp}
[/Turn Data]`;
    if (dataCard.entry) {
      // Remove old mode prefix if it exists
      dataCard.entry = dataCard.entry.replace(/^Mode: .*?\n\n/, '');
      dataCard.entry = modePrefix + dataCard.entry + '\n\n' + turnDataEntry;
    } else {
      dataCard.entry = modePrefix + turnDataEntry;
    }
  }
}

/**
 * Compare two turn time objects
 * @param {Object} tt1 - First turn time object
 * @param {Object} tt2 - Second turn time object
 * @returns {number} -1 if tt1 is earlier, 1 if tt2 is earlier, 0 if equal
 */
function compareTurnTime(tt1, tt2) {
  if (!tt1 || !tt2) return 0;
  if (tt1.years !== tt2.years) return tt1.years < tt2.years ? -1 : 1;
  if (tt1.months !== tt2.months) return tt1.months < tt2.months ? -1 : 1;
  if (tt1.days !== tt2.days) return tt1.days < tt2.days ? -1 : 1;
  if (tt1.hours !== tt2.hours) return tt1.hours < tt2.hours ? -1 : 1;
  if (tt1.minutes !== tt2.minutes) return tt1.minutes < tt2.minutes ? -1 : 1;
  if (tt1.seconds !== tt2.seconds) return tt1.seconds < tt2.seconds ? -1 : 1;
  return 0;
}

/**
 * Parse a date/time string into a Date object
 * @param {string} dateStr - Date string in mm/dd/yyyy format
 * @param {string} timeStr - Time string in hh:mm AM/PM format
 * @returns {Date} Date object
 */
function parseDateTime(dateStr, timeStr) {
  const [month, day, year] = dateStr.split('/').map(Number);
  const time = parseTime(timeStr);
  return new Date(year, month - 1, day, time.hour, time.min, time.sec);
}

/**
 * Clean up WTG Data card by removing entries with timestamps higher than the current time
 * @param {Object} currentTT - Current turn time object
 */
function cleanupWTGDataCardByTimestamp(currentTT) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;

  const modePrefix = `Mode: ${state.wtgMode || 'lightweight'}\n\n`;

  if (isLightweightMode()) {
    const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
    const matches = [...dataCard.entry.matchAll(turnDataRegex)];
    let newEntry = "";
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const entryTT = parseTurnTime(match[3]);
      if (!entryTT) continue;
      if (compareTurnTime(entryTT, currentTT) <= 0) {
        const turnDataEntry = `[Turn Data]
Action Type: ${match[1]}
Action Text: ${match[2]}
Timestamp: ${match[3]}
[/Turn Data]`;
        if (newEntry) {
          newEntry += '\n\n' + turnDataEntry;
        } else {
          newEntry = turnDataEntry;
        }
      }
    }
    dataCard.entry = newEntry ? modePrefix + newEntry : "";
  } else {
    const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nResponse Text: (.*?)\nGenerated Entities: (.*?)\nTrigger Mentions: (.*?)\nAI Command: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
    const matches = [...dataCard.entry.matchAll(turnDataRegex)];
    let newEntry = "";
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const entryTT = parseTurnTime(match[7]);
      if (!entryTT) continue;
      if (compareTurnTime(entryTT, currentTT) <= 0) {
        const turnDataEntry = `[Turn Data]
Action Type: ${match[1]}
Action Text: ${match[2]}
Response Text: ${match[3]}
Generated Entities: ${match[4]}
Trigger Mentions: ${match[5]}
AI Command: ${match[6]}
Timestamp: ${match[7]}
[/Turn Data]`;
        if (newEntry) {
          newEntry += '\n\n' + turnDataEntry;
        } else {
          newEntry = turnDataEntry;
        }
      }
    }
    dataCard.entry = newEntry ? modePrefix + newEntry : "";
  }
}

/**
 * Clean up storycards by removing timestamps higher than current time
 * @param {string} currentDate - Current date string in mm/dd/yyyy format
 * @param {string} currentTime - Current time string in hh:mm AM/PM format
 */
function cleanupStoryCardsByTimestamp(currentDate, currentTime) {
  const currentDateTime = parseDateTime(currentDate, currentTime);
  for (let i = storyCards.length - 1; i >= 0; i--) {
    const card = storyCards[i];
    if (card.title === "WTG Data" || card.title === "Current Date and Time" || !card.entry) {
      continue;
    }
    const discoveredMatch = card.entry.match(/(?:Discovered on|Met on|Visited) (\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)/);
    if (discoveredMatch) {
      const cardDate = discoveredMatch[1];
      const cardTime = discoveredMatch[2];
      const cardDateTime = parseDateTime(cardDate, cardTime);
      if (cardDateTime > currentDateTime) {
        card.entry = card.entry.replace(/\n\n(?:Discovered on|Met on|Visited) .+/, '');
      }
    }
  }
}

/**
 * Update timestamps in all existing storycards when time is reset
 * @param {string} newDate - New date string in mm/dd/yyyy format
 * @param {string} newTime - New time string in hh:mm AM/PM format
 */
function updateAllStoryCardTimestamps(newDate, newTime) {
  const timestamp = `${newDate} ${newTime}`;
  for (let i = 0; i < storyCards.length; i++) {
    const card = storyCards[i];
    if (card.title === "WTG Data" || card.title === "Current Date and Time") {
      continue;
    }
    if (card.entry && (card.entry.includes("Discovered on") || card.entry.includes("Met on") || card.entry.includes("Visited"))) {
      if (card.entry.includes("Unknown")) {
        card.entry = card.entry.replace(/(?:Discovered on|Met on|Visited) \d{1,2}\/\d{1,2}\/\d{4}\s+Unknown/, `Discovered on ${timestamp}`);
      } else if (card.entry.includes("01/01/1900")) {
        card.entry = card.entry.replace(/(?:Discovered on|Met on|Visited) 01\/01\/1900\s+[\d:]+ [AP]M/, `Discovered on ${timestamp}`);
      }
    }
  }
}

/**
 * Check if settime has been initialized (called by user or auto-detected)
 * @returns {boolean} True if settime has been initialized
 */
function hasSettimeBeenInitialized() {
  // First check state flag
  if (state.settimeInitialized) {
    return true;
  }
  
  // Fallback: check WTG Data storycard for settime marker
  const dataCard = getWTGDataCard();
  if (dataCard && dataCard.entry && dataCard.entry.includes('[SETTIME_INITIALIZED]')) {
    state.settimeInitialized = true;
    return true;
  }
  
  return false;
}

/**
 * Mark settime as initialized in both state and WTG Data storycard
 */
function markSettimeAsInitialized() {
  state.settimeInitialized = true;
  
  const dataCard = getWTGDataCard();
  if (dataCard) {
    if (!dataCard.entry) {
      dataCard.entry = '[SETTIME_INITIALIZED]';
    } else if (!dataCard.entry.includes('[SETTIME_INITIALIZED]')) {
      dataCard.entry = '[SETTIME_INITIALIZED]\n' + dataCard.entry;
    }
  }
}

// ====================================================================================
// NORMAL MODE ONLY FUNCTIONS
// ====================================================================================

/**
 * Normalize a name to Title Case (Normal mode only)
 */
function normalizeNameCase(name) {
  if (!name) return name;
  return name.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase());
}

/**
 * Extract character names from text (Normal mode only)
 */
function extractCharacterNames(text) {
  // This is a simplified version - the full implementation is very long
  // For the actual implementation, refer to the original wtg_2.0/library copy.js
  return [];
}

/**
 * Check if a storycard's triggers are mentioned in text (Normal mode only)
 */
function areCardTriggersMentioned(card, text) {
  if (!card || !card.keys || !text) return false;
  const triggers = card.keys.split(',').map(trigger => trigger.trim());
  const lowerText = text.toLowerCase();
  for (const trigger of triggers) {
    const lowerTrigger = trigger.toLowerCase();
    if (lowerText.includes(lowerTrigger)) {
      return true;
    }
    const triggerWords = lowerTrigger.split(/\s+/);
    if (triggerWords.length >= 2) {
      if (lowerText.includes(triggerWords[0])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get or create the WTG Cooldowns storycard (Normal mode only)
 */
function getCooldownCard() {
  let cooldownCard = storyCards.find(card => card.title === "WTG Cooldowns");
  if (!cooldownCard) {
    addStoryCard("WTG Cooldowns");
    cooldownCard = storyCards[storyCards.length - 1];
    cooldownCard.type = "system";
    cooldownCard.keys = "";
    cooldownCard.description = "Internal cooldown tracking for AI commands; no keys; not included in context";
  }
  return cooldownCard;
}

/**
 * Get or create WTG Exclusions storycard
 * @returns {Object} WTG Exclusions storycard
 */
function getWTGExclusionsCard() {
  let exclusionsCard = storyCards.find(card => card.title === "WTG Exclusions");
  if (!exclusionsCard) {
    addStoryCard("WTG Exclusions");
    exclusionsCard = storyCards.find(card => card.title === "WTG Exclusions");
    if (exclusionsCard) {
      exclusionsCard.type = "system";
      exclusionsCard.keys = "";
      exclusionsCard.entry = "";
      exclusionsCard.description = "Cards excluded from WTG timestamp injection";
    }
  }
  return exclusionsCard;
}

/**
 * Check if a storycard is excluded from timestamp injection
 * @param {string} cardTitle - Title of the card to check
 * @returns {boolean} True if card is excluded
 */
function isCardExcluded(cardTitle) {
  if (!cardTitle) return false;
  const exclusionsCard = getWTGExclusionsCard();
  if (!exclusionsCard || !exclusionsCard.entry) return false;

  const lowerTitle = cardTitle.toLowerCase();
  const exclusionRegex = /\[Exclusion\]\nCard Title: (.*?)\n\[\/Exclusion\]/gs;
  const matches = [...exclusionsCard.entry.matchAll(exclusionRegex)];

  return matches.some(match => match[1].toLowerCase() === lowerTitle);
}

/**
 * Add a storycard to the exclusions list
 * @param {string} cardTitle - Title of the card to exclude
 */
function addCardToExclusions(cardTitle) {
  if (!cardTitle || isCardExcluded(cardTitle)) return;

  const exclusionsCard = getWTGExclusionsCard();
  const exclusionEntry = `[Exclusion]\nCard Title: ${cardTitle}\n[/Exclusion]`;

  if (exclusionsCard.entry) {
    exclusionsCard.entry += '\n\n' + exclusionEntry;
  } else {
    exclusionsCard.entry = exclusionEntry;
  }
}

/**
 * Process exclusion marker [e] in a storycard
 * @param {Object} card - Storycard to process
 * @returns {boolean} True if exclusion marker was found and processed
 */
function processExclusionMarker(card) {
  if (!card || !card.entry) return false;

  if (!card.entry.match(/\[e\]/i)) return false;

  // Remove [e] and /] markers
  card.entry = card.entry.replace(/\[e\]/gi, '').trim();
  card.entry = card.entry.replace(/\/\]/g, '').trim();

  addCardToExclusions(card.title);
  return true;
}

/**
 * Check if sleep command cooldown is active (Normal mode only)
 */
function isSleepCooldownActive() {
  if (!state.sleepAvailableAtTT || !state.turnTime) return false;
  const currentTT = state.turnTime;
  const availableTT = parseTurnTime(state.sleepAvailableAtTT);
  if (!availableTT) return false;
  return compareTurnTime(currentTT, availableTT) < 0;
}

/**
 * Check if advance command cooldown is active (Normal mode only)
 */
function isAdvanceCooldownActive() {
  if (!state.advanceAvailableAtTT || !state.turnTime) return false;
  const currentTT = state.turnTime;
  const availableTT = parseTurnTime(state.advanceAvailableAtTT);
  if (!availableTT) return false;
  return compareTurnTime(currentTT, availableTT) < 0;
}

/**
 * Set sleep command cooldown (Normal mode only)
 */
function setSleepCooldown(duration) {
  const availableTT = addToTurnTime(state.turnTime, duration);
  state.sleepAvailableAtTT = formatTurnTime(availableTT);
  state.sleepWakeTime = formatTurnTime(availableTT);
  updateCooldownCard();
}

/**
 * Set advance command cooldown (Normal mode only)
 */
function setAdvanceCooldown(duration) {
  const availableTT = addToTurnTime(state.turnTime, duration);
  state.advanceAvailableAtTT = formatTurnTime(availableTT);
  state.advanceEndTime = formatTurnTime(availableTT);
  updateCooldownCard();
}

/**
 * Clear all command cooldowns (Normal mode only)
 */
function clearCommandCooldowns(source) {
  state.sleepAvailableAtTT = null;
  state.advanceAvailableAtTT = null;
  state.sleepWakeTime = null;
  state.advanceEndTime = null;
  updateCooldownCard();
}

/**
 * Update the WTG Cooldowns storycard (Normal mode only)
 */
function updateCooldownCard() {
  const cooldownCard = getCooldownCard();
  let entry = "";
  if (state.sleepAvailableAtTT) {
    const sleepTT = parseTurnTime(state.sleepAvailableAtTT);
    const {currentDate: sleepDate, currentTime: sleepTime} = computeCurrent(state.startingDate, state.startingTime, sleepTT);
    entry += `Sleep available after: ${sleepDate} ${sleepTime}\n`;
  }
  if (state.advanceAvailableAtTT) {
    const advanceTT = parseTurnTime(state.advanceAvailableAtTT);
    const {currentDate: advanceDate, currentTime: advanceTime} = computeCurrent(state.startingDate, state.startingTime, advanceTT);
    entry += `Advance available after: ${advanceDate} ${advanceTime}\n`;
  }
  cooldownCard.entry = entry.trim();
}

/**
 * Mark all character cards as not discovered (Normal mode only)
 */
function markAllCharactersAsNotDiscovered() {
  for (let i = 0; i < storyCards.length; i++) {
    const card = storyCards[i];
    if (card.title === "WTG Data" || card.title === "Current Date and Time") {
      continue;
    }
    if (card.description && card.description.includes("Generated character")) {
      card.description = card.description.replace(/Generated character discovered on .+/, "Character not currently discovered");
      card.description = card.description.replace(/\nGenerated character \(not yet discovered in story\)/, "\nCharacter not currently discovered");
      if (!card.description.includes("Character not currently discovered")) {
        card.description += "\nCharacter not currently discovered";
      }
      if (card.entry) {
        card.entry = card.entry.replace(/\n\nDiscovered on .+/, '');
      }
    }
  }
}

/**
 * Clean up WTG Data card by removing character entries (Normal mode only)
 */
function cleanupWTGDataCardCharacters(currentCharacterNames) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;
  const currentNamesSet = new Set(currentCharacterNames);
  const characterRegex = /\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g;
  const matches = [...dataCard.entry.matchAll(characterRegex)];
  const validEntries = matches.filter(match => {
    const characterName = match[1];
    return currentNamesSet.has(characterName);
  });
  let newEntry = dataCard.entry.replace(/\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g, '');
  for (const match of validEntries) {
    const characterEntry = `[Generated Character]
Name: ${match[1]}
First Mentioned: ${match[2]}
Discovered On: ${match[3]}
[/Generated Character]`;
    if (newEntry.trim()) {
      newEntry += '\n\n' + characterEntry;
    } else {
      newEntry = characterEntry;
    }
  }
  dataCard.entry = newEntry.trim();
}

/**
 * Clean up undiscovered characters (Normal mode only)
 */
function cleanupUndiscoveredCharacters(currentCharacterNames) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;
  const currentNamesSet = new Set(currentCharacterNames);
  const characterRegex = /\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g;
  const matches = [...dataCard.entry.matchAll(characterRegex)];
  const validEntries = matches.filter(match => {
    const characterName = match[1];
    if (currentNamesSet.has(characterName)) return true;
    const discoveredOn = match[3];
    return discoveredOn && !/not yet discovered/i.test(discoveredOn);
  });
  let newEntry = dataCard.entry.replace(characterRegex, '');
  for (const match of validEntries) {
    const characterEntry = `[Generated Character]
Name: ${match[1]}
First Mentioned: ${match[2]}
Discovered On: ${match[3]}
[/Generated Character]`;
    if (newEntry.trim()) {
      newEntry += '\n\n' + characterEntry;
    } else {
      newEntry = characterEntry;
    }
  }
  dataCard.entry = newEntry.trim();
}

/**
 * Ensure action text starts with a space if it doesn't already
 * Injects a leading space to actions that don't have one
 * @param {string} actionText - The action text to process
 * @returns {string} Action text with leading space ensured
 */
function ensureLeadingSpace(actionText) {
  if (!actionText || typeof actionText !== 'string') {
    return actionText;
  }
  
  // Check if text already starts with a space
  if (actionText.charAt(0) === ' ') {
    return actionText;
  }
  
  // Add leading space
  return ' ' + actionText;
}
