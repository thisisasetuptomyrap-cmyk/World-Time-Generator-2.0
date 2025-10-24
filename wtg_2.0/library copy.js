// library.js - Core time management functions for the new WTG implementation

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
  if (!match) return null;
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
 * Get last turn time and character count from history
 * @param {Array} history - History array
 * @returns {Object} Object with lastTT and charsAfter
 */
function getLastTurnTimeAndChars(history) {
  let lastTT = {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
  let charsAfter = 0;
  let found = false;
  for (let i = history.length - 1; i >= 0; i--) {
    const actionText = history[i].text;
    const match = actionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]$/);
    if (match) {
      lastTT = parseTurnTime(match[1]);
      found = true;
      break;
    } else {
      charsAfter += actionText.length;
    }
  }
  if (!found) {
    charsAfter = history.reduce((sum, action) => sum + action.text.length, 0);
  }
  return {lastTT, charsAfter};
}

/**
 * Extract odd-numbered words from text
 * @param {string} text - Text to process
 * @returns {string} String with odd-numbered words
 */
function extractOddWords(text) {
  const words = text.split(/\s+/);
  const oddWords = [];
  for (let i = 0; i < words.length; i += 2) {
    oddWords.push(words[i]);
  }
  return oddWords.join(' ');
}

/**
 * Extract keywords from text
 * @param {string} text - Text to process
 * @returns {Array} Array of keywords
 */
function extractKeywords(text) {
  // Simple keyword extraction - in a real implementation, this could be more sophisticated
  const words = text.split(/\s+/);
  const keywords = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w]/g, '').toLowerCase();
    if (word.length > 3 && !/^\d+$/.test(word)) {
      keywords.push(word);
    }
  }
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Calculate keyword similarity between two arrays
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
    dateTimeCard.description = "Commands:\n[settime mm/dd/yyyy time] - Set starting date and time\n[advance N [hours|days|months|years] [M minutes]] - Advance time/date\n[sleep] - Sleep to next morning\n[reset] - Reset to most recent mention in history";
  }
  return dateTimeCard;
}

/**
 * Get or create WTG Settings storycard
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
    settingsCard.entry = `Time Duration Multiplier: 1.0
Enable Generated Character Cards: true
Enable Generated Location Cards: true
Disable Generated Card Deletion: true
Debug Mode: false
Enable Dynamic Time: true
Disable WTG Entirely: false`;
  } else {
    // Ensure keys are always empty
    settingsCard.keys = "";
  }
  return settingsCard;
}

/**
 * Get a boolean setting from the WTG Settings card
 * @param {string} settingName - Name of the setting to retrieve
 * @returns {boolean} The boolean value of the setting, or false if not found
 */
function getWTGBooleanSetting(settingName) {
  const settingsCard = getWTGSettingsCard();
  if (!settingsCard || !settingsCard.entry) return false;

  const regex = new RegExp(`${settingName}:\\s*(true|false)`, 'i');
  const match = settingsCard.entry.match(regex);
  return match ? match[1].toLowerCase() === 'true' : false;
}

/**
 * Get dynamic time factor based on turn content analysis
 * @param {string} turnText - Text from player input and AI response
 * @returns {number} Time factor (0.5 for quick turns, 2.0 for long turns, 1.0 for medium/default)
 */
function getDynamicTimeFactor(turnText) {
  const lowerText = turnText.toLowerCase();
  // Quick turns (dialogue, immediate actions)
  if (lowerText.match(/\b(say|ask|talk|whisper|reply)\b/)) {
    return 0.5; // Time passes slower
  }
  // Long turns (travel, waiting, extended events)
  if (lowerText.match(/\b(journey|travel|wait|sleep|days|hours)\b/)) {
    return 2.0; // Time passes faster
  }
  // Medium/default turns
  return 1.0;
}

/**
 * Sanitize an entity name by trimming whitespace and stripping surrounding punctuation
 * @param {string} name - The entity name to sanitize
 * @returns {string} The sanitized entity name
 */
function sanitizeEntityName(name) {
  if (!name) return '';
  return name.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
}

/**
 * Normalize keys for an entity by returning an array of lowercase and kebab-case keys
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
 * Find or create a storycard with case-insensitive matching, skipping system cards and empty titles
 * @param {string} title - Title of the storycard to find or create
 * @returns {Object|null} The found or created storycard, or null if title is empty or system card
 */
function findOrCreateCard(title) {
  if (!title || title.trim() === '') return null;

  const trimmedTitle = title.trim();
  const lowerTitle = trimmedTitle.toLowerCase();

  // Skip system cards
  const systemTitles = ["WTG Data", "Current Date and Time", "World Time Generator Settings"];
  if (systemTitles.some(sysTitle => sysTitle.toLowerCase() === lowerTitle)) {
    return null;
  }

  // Find existing card with case-insensitive matching
  let existingCard = storyCards.find(card =>
    card.title && card.title.toLowerCase() === lowerTitle
  );

  if (existingCard) {
    return existingCard;
  }

  // Create new card if not found
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

  // Add wake up timestamp if sleep was used
  if (state.sleepWakeTime) {
    const wakeTT = parseTurnTime(state.sleepWakeTime);
    const {currentDate: wakeDate, currentTime: wakeTime} = computeCurrent(state.startingDate, state.startingTime, wakeTT);
    entry += `\n\nWoke up on: ${wakeDate} ${wakeTime}`;
  }

  // Add advance timestamp if advance was used
  if (state.advanceEndTime) {
    const advanceTT = parseTurnTime(state.advanceEndTime);
    const {currentDate: advanceDate, currentTime: advanceTime} = computeCurrent(state.startingDate, state.startingTime, advanceTT);
    entry += `\n\nAdvanced until: ${advanceDate} ${advanceTime}`;
  }

  dateTimeCard.entry = entry;
}

/**
 * Add timestamp to a storycard if it doesn't have one
 * @param {Object} card - Storycard to update
 * @param {string} timestamp - Timestamp to add
 * @param {boolean} isGenerated - Whether this entity was generated in this turn
 */
function addTimestampToCard(card, timestamp, isGenerated = false) {
   // Check if this is a character card that hasn't been discovered yet
   if (card && card.description && card.description.includes("Generated character") && card.description.includes("not yet discovered in story")) {
     // Don't add timestamp to character cards that haven't been discovered yet
     return;
   }

   // Don't add timestamps if we're still using default date/time (01/01/1900 Unknown)
   if (timestamp && (timestamp.includes("01/01/1900") || timestamp.includes("Unknown"))) {
     return;
   }

   // For all other cards (including discovered character cards), add timestamp if it doesn't have one
   if (card && card.entry && !card.entry.includes("Discovered on") && !card.entry.includes("Met on") && !card.entry.includes("Visited")) {
     // Determine the appropriate discovery verb based on card type
     let discoveryVerb = "Discovered on";

     if (card.type === "character" || (card.description && card.description.includes("Generated character"))) {
       discoveryVerb = "Met on";
     } else if (card.type === "location" || card.type === "place" || card.type === "area" ||
                (card.keys && (card.keys.includes("location") || card.keys.includes("place") ||
                               card.keys.includes("city") || card.keys.includes("town") ||
                               card.keys.includes("village") || card.keys.includes("building")))) {
       discoveryVerb = "Visited";
     }

     // Add "generated" label if this entity was generated in this turn
     const generatedLabel = isGenerated ? " (generated)" : "";
     card.entry += `\n\n${discoveryVerb} ${timestamp}${generatedLabel}`;
   }
}

/**
 * Check if a storycard already has a "Discovered on" timestamp
 * @param {Object} card - Storycard to check
 * @returns {boolean} True if card has a "Discovered on" timestamp
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
 * Get the timestamp from a storycard
 * @param {Object} card - Storycard to check
 * @returns {string|null} Timestamp string or null if not found
 */
function getCardTimestamp(card) {
  if (!card || !card.entry) return null;
  const match = card.entry.match(/Discovered on (\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)/);
  return match ? `${match[1]} ${match[2]}` : null;
}

/**
 * Get turn data from WTG Data storycard
 * @returns {Array} Array of turn data objects
 */
function getTurnData() {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return [];

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

/**
 * Add turn data to WTG Data storycard
 * @param {string} actionType - Type of action (do, say, story, continue)
 * @param {string} actionText - Full text of action
 * @param {string} responseText - Response text with first 2 sentences
 * @param {string} timestamp - Timestamp in turntime format
 * @param {Array} generatedEntities - Array of generated characters/locations in this turn
 * @param {Array} triggerMentions - Array of trigger mentions in this turn
 * @param {string} aiCommand - AI-generated command (sleep or advance) used in this turn
 */
function addTurnData(actionType, actionText, responseText, timestamp, generatedEntities = [], triggerMentions = [], aiCommand = null) {
  const dataCard = getWTGDataCard();

  // Format generated entities with brackets
  const formattedEntities = generatedEntities.length > 0 ? generatedEntities.map(entity => `[${entity.type}:${entity.name}]`).join(' ') : '';

  // Format trigger mentions
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
    dataCard.entry += '\n\n' + turnDataEntry;
  } else {
    dataCard.entry = turnDataEntry;
  }
}

/**
 * Track a generated character in the WTG Data card
 * @param {string} name - Character name
 * @param {string} actionText - Action text where character was first mentioned
 * @param {string} timestamp - Timestamp when character was discovered
 */
function trackGeneratedCharacter(name, actionText, timestamp) {
  const dataCard = getWTGDataCard();
  
  const characterEntry = `[Generated Character]
Name: ${name}
First Mentioned: ${actionText.substring(0, 100)}...
Discovered On: ${timestamp}
[/Generated Character]`;
  
  if (dataCard.entry) {
    dataCard.entry += '\n\n' + characterEntry;
  } else {
    dataCard.entry = characterEntry;
  }
}

/**
 * Track a potential character in the WTG Data card without marking as discovered
 * @param {string} name - Character name
 * @param {string} actionText - Action text where character was first mentioned
 */
function trackPotentialCharacter(name, actionText) {
  const dataCard = getWTGDataCard();
  
  const characterEntry = `[Generated Character]
Name: ${name}
First Mentioned: ${actionText.substring(0, 100)}...
Discovered On: not yet discovered in story
[/Generated Character]`;
  
  if (dataCard.entry) {
    dataCard.entry += '\n\n' + characterEntry;
  } else {
    dataCard.entry = characterEntry;
  }
}

/**
 * Update the discovery status of a character in the WTG Data card
 * @param {string} name - Character name
 * @param {string} timestamp - Discovery timestamp
 */
function updateCharacterDiscoveryStatus(name, timestamp) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;
  
  // Find the character entry and update its discovery status
  const characterRegex = /\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g;
  const matches = [...dataCard.entry.matchAll(characterRegex)];
  
  // Find the matching character entry
  let foundMatch = null;
  for (const match of matches) {
    if (match[1] === name) {
      foundMatch = match;
      break;
    }
  }
  
  if (foundMatch) {
    // Replace the old entry with the updated one
    const oldEntry = `[Generated Character]
Name: ${foundMatch[1]}
First Mentioned: ${foundMatch[2]}
Discovered On: ${foundMatch[3]}
[/Generated Character]`;
    
    const newEntry = `[Generated Character]
Name: ${foundMatch[1]}
First Mentioned: ${foundMatch[2]}
Discovered On: ${timestamp}
[/Generated Character]`;
    
    dataCard.entry = dataCard.entry.replace(oldEntry, newEntry);
  }
}


/**
 * Clean up WTG Data card by removing entries that don't match the previous action
 * @param {string} previousActionText - Text of the previous action to match
 */
function cleanupWTGDataCard(previousActionText) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;

  const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nResponse Text: (.*?)\nGenerated Entities: (.*?)\nTrigger Mentions: (.*?)\nAI Command: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
  const matches = [...dataCard.entry.matchAll(turnDataRegex)];
  
  // Find the last matching entry
  let lastMatchIndex = -1;
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i][2] === previousActionText) {
      lastMatchIndex = i;
      break;
    }
  }

  // If no matching entry found, keep only the most recent entry if it exists
  if (lastMatchIndex < 0 && matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const turnDataEntry = `[Turn Data]
Action Type: ${lastMatch[1]}
Action Text: ${lastMatch[2]}
Response Text: ${lastMatch[3]}
Generated Entities: ${lastMatch[4]}
Trigger Mentions: ${lastMatch[5]}
AI Command: ${lastMatch[6]}
Timestamp: ${lastMatch[7]}
[/Turn Data]`;

    dataCard.entry = turnDataEntry;
    return;
  }
  
  // If we found a matching entry, keep only entries up to and including that entry
  if (lastMatchIndex >= 0) {
    // Rebuild the entry with only the matching entries and earlier ones
    let newEntry = "";
    for (let i = 0; i <= lastMatchIndex; i++) {
      const match = matches[i];
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
    
    dataCard.entry = newEntry;
  } else {
    // If no matching entry found, we might want to clear the card or keep only the most recent entries
    // For now, let's keep only the most recent entry if it exists
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const turnDataEntry = `[Turn Data]
Action Type: ${lastMatch[1]}
Action Text: ${lastMatch[2]}
Response Text: ${lastMatch[3]}
Generated Entities: ${lastMatch[4]}
Trigger Mentions: ${lastMatch[5]}
AI Command: ${lastMatch[6]}
Timestamp: ${lastMatch[7]}
[/Turn Data]`;
      
      dataCard.entry = turnDataEntry;
    }
  }
}

/**
 * Compare two turn time objects to determine which is earlier
 * @param {Object} tt1 - First turn time object
 * @param {Object} tt2 - Second turn time object
 * @returns {number} -1 if tt1 is earlier, 1 if tt2 is earlier, 0 if equal
 */
function compareTurnTime(tt1, tt2) {
  // Guard against null/undefined inputs
  if (!tt1 || !tt2) {
    return 0; // Treat as equal if either is null
  }

  // Compare years
  if (tt1.years !== tt2.years) {
    return tt1.years < tt2.years ? -1 : 1;
  }
  
  // Compare months
  if (tt1.months !== tt2.months) {
    return tt1.months < tt2.months ? -1 : 1;
  }
  
  // Compare days
  if (tt1.days !== tt2.days) {
    return tt1.days < tt2.days ? -1 : 1;
  }
  
  // Compare hours
  if (tt1.hours !== tt2.hours) {
    return tt1.hours < tt2.hours ? -1 : 1;
  }
  
  // Compare minutes
  if (tt1.minutes !== tt2.minutes) {
    return tt1.minutes < tt2.minutes ? -1 : 1;
  }
  
  // Compare seconds
  if (tt1.seconds !== tt2.seconds) {
    return tt1.seconds < tt2.seconds ? -1 : 1;
  }
  
  // Equal
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

  const turnDataRegex = /\[Turn Data\]\nAction Type: (.*?)\nAction Text: (.*?)\nResponse Text: (.*?)\nGenerated Entities: (.*?)\nTrigger Mentions: (.*?)\nAI Command: (.*?)\nTimestamp: (.*?)\n\[\/Turn Data\]/gs;
  const matches = [...dataCard.entry.matchAll(turnDataRegex)];

  // Keep only entries with timestamps less than or equal to current time
  let newEntry = "";
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const entryTT = parseTurnTime(match[7]);

    // Skip entries with invalid timestamps
    if (!entryTT) continue;

    // If entry timestamp is less than or equal to current timestamp, keep it
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

  dataCard.entry = newEntry;
}

/**
 * Remove character entries from WTG Data card if they aren't currently detected in the story
 * @param {Array} currentCharacterNames - Array of currently detected character names
 */
function cleanupWTGDataCardCharacters(currentCharacterNames) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return;
  
  // Create a set of current character names for faster lookup
  const currentNamesSet = new Set(currentCharacterNames);
  
  // Extract all generated character entries from the WTG Data card
  const characterRegex = /\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g;
  const matches = [...dataCard.entry.matchAll(characterRegex)];
  
  // Filter out characters that are not currently detected
  const validEntries = matches.filter(match => {
    const characterName = match[1];
    return currentNamesSet.has(characterName);
  });
  
  // Rebuild the entry with only valid character entries
  let newEntry = dataCard.entry.replace(/\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g, '');
  
  // Add back the valid character entries
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
  
  // Update the data card entry
  dataCard.entry = newEntry.trim();
}

/**
 * Check if a character is tracked in the WTG Data card
 * @param {string} name - Character name to check
 * @returns {boolean} True if character is tracked
 */
function isCharacterTracked(name) {
  const dataCard = getWTGDataCard();
  if (!dataCard.entry) return false;
  
  const characterRegex = /\[Generated Character\]\nName: (.*?)\nFirst Mentioned: (.*?)\nDiscovered On: (.*?)\n\[\/Generated Character\]/g;
  const matches = [...dataCard.entry.matchAll(characterRegex)];
  
  return matches.some(match => match[1] === name);
}

/**
 * Clean up storycards by marking those with "Discovered on" timestamps higher than current time as not discovered
 * @param {string} currentDate - Current date string in mm/dd/yyyy format
 * @param {string} currentTime - Current time string in hh:mm AM/PM format
 */
function cleanupStoryCardsByTimestamp(currentDate, currentTime) {
  const currentDateTime = parseDateTime(currentDate, currentTime);
  
  // Iterate through storycards and mark those with future "Discovered on" timestamps as not discovered
  for (let i = storyCards.length - 1; i >= 0; i--) {
    const card = storyCards[i];

    // Skip the WTG Data card and cards without entries
    if (card.title === "WTG Data" || !card.entry) {
      continue;
    }

    // Check if card has a "Discovered on" timestamp
    const discoveredMatch = card.entry.match(/Discovered on (\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)/);
    if (discoveredMatch) {
      const cardDate = discoveredMatch[1];
      const cardTime = discoveredMatch[2];
      const cardDateTime = parseDateTime(cardDate, cardTime);

      // If card timestamp is later than current time, remove the "Discovered on" timestamp
      if (cardDateTime > currentDateTime) {
        card.entry = card.entry.replace(/\n\nDiscovered on .+/, '');
      }
    }
  }
}

/**
 * Clean up character entries that were never actually discovered in the story
 * @param {Array} currentCharacterNames - Array of currently detected character names
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
 * Mark all character cards as not discovered at the start of an adventure
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
 * Normalize a name to Title Case, preserving hyphens/apostrophes (e.g., bob -> Bob, o'hara -> O'Hara)
 */
function normalizeNameCase(name) {
  if (!name) return name;
  return name.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase());
}

/**
 * Extract potential character names from text using heuristics
 * @param {string} text - Text to scan for character names
 * @returns {Array} Array of potential character names
 */
function extractCharacterNames(text) {
  // Common stop words that shouldn't be considered names
  const stopWords = new Set([
    'The', 'And', 'But', 'For', 'You', 'Your', 'With', 'From', 'That', 'This',
    'Have', 'Were', 'Where', 'When', 'What', 'Who', 'Why', 'How', 'Can', 'Could',
    'Will', 'Would', 'Should', 'May', 'Might', 'Must', 'Shall', 'Do', 'Does',
    'Did', 'Done', 'Has', 'Had', 'Am', 'Is', 'Are', 'Was', 'Be', 'Been', 'Being',
    'Not', 'No', 'Yes', 'Okay', 'Ok', 'Sure', 'Well', 'Now', 'Then', 'Here',
    'There', 'Over', 'Under', 'Above', 'Below', 'Behind', 'Before', 'After',
    'During', 'While', 'Until', 'Since', 'Because', 'Although', 'Though', 'Even',
    'Very', 'Really', 'Quite', 'Rather', 'Fairly', 'Pretty', 'Too', 'So', 'Such',
    'Own', 'Same', 'Other', 'Another', 'Any', 'Some', 'Every', 'Each', 'All',
    'Both', 'Either', 'Neither', 'Few', 'Many', 'Much', 'More', 'Most', 'Less',
    'Least', 'Little', 'Big', 'Large', 'Small', 'Great', 'Good', 'Bad', 'New',
    'Old', 'Young', 'First', 'Last', 'Next', 'Previous', 'Day', 'Night', 'Time',
    'Way', 'Thing', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Man', 'Woman', 'Men', 'Women', 'Person', 'People', 'Child',
    'Children', 'Boy', 'Girl', 'Baby', 'House', 'Home', 'Room', 'Door', 'Window',
    'Car', 'Street', 'Road', 'City', 'Town', 'Country', 'World', 'Earth', 'Sun',
    'Moon', 'Star', 'Sky', 'Water', 'Fire', 'Air', 'Earth', 'Wind', 'Light',
    'Dark', 'Darkness', 'Sound', 'Voice', 'Word', 'Name', 'Title', 'King', 'Queen',
    'Lord', 'Lady', 'Sir', 'Master', 'Mistress', 'Doctor', 'Teacher', 'Friend',
    'Enemy', 'Foe', 'Ally', 'Partner', 'Spouse', 'Parent', 'Mother', 'Father',
    'Son', 'Daughter', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Cousin', 'Nephew',
    'Niece', 'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter', 'Family',
    'Money', 'Gold', 'Silver', 'Food', 'Drink', 'Meal', 'Dinner', 'Breakfast',
    'Lunch', 'Supper', 'Clothes', 'Clothing', 'Shirt', 'Pants', 'Dress', 'Shoes',
    'Hat', 'Coat', 'Jacket', 'Bag', 'Book', 'Letter', 'Paper', 'Pen', 'Pencil',
    'Phone', 'Computer', 'Game', 'Music', 'Song', 'Dance', 'Art', 'Painting',
    'Sculpture', 'Building', 'Bridge', 'Tower', 'Castle', 'Palace', 'Temple',
    'Church', 'School', 'Hospital', 'Store', 'Shop', 'Market', 'Restaurant',
    'Hotel', 'Inn', 'Tavern', 'Bar', 'Pub', 'Cafe', 'Garden', 'Park', 'Forest',
    'Mountain', 'River', 'Lake', 'Ocean', 'Sea', 'Island', 'Desert', 'Jungle',
    'Cave', 'Hole', 'Hill', 'Valley', 'Plain', 'Field', 'Farm', 'Village',
    'Settlement', 'Fort', 'Camp', 'Army', 'Navy', 'Police', 'Guard', 'Soldier',
    'Warrior', 'Knight', 'Wizard', 'Witch', 'Mage', 'Sorcerer', 'Sorceress',
    'Priest', 'Priestess', 'Monk', 'Nun', 'God', 'Goddess', 'Angel', 'Demon',
    'Devil', 'Monster', 'Beast', 'Animal', 'Bird', 'Fish', 'Dog', 'Cat', 'Horse',
    'Cow', 'Pig', 'Sheep', 'Goat', 'Chicken', 'Duck', 'Goose', 'Rabbit', 'Mouse',
    'Rat', 'Snake', 'Spider', 'Insect', 'Bug', 'Fly', 'Ant', 'Bee', 'Wasp', 'Bee',
    'Tree', 'Flower', 'Plant', 'Grass', 'Stone', 'Rock', 'Metal', 'Wood', 'Glass',
    'Paper', 'Cloth', 'Silk', 'Cotton', 'Wool', 'Leather', 'Bone', 'Skin', 'Hair',
    'Eye', 'Ear', 'Nose', 'Mouth', 'Hand', 'Foot', 'Head', 'Body', 'Heart', 'Soul',
    'Mind', 'Thought', 'Idea', 'Dream', 'Nightmare', 'Memory', 'Secret', 'Story',
    'Tale', 'Legend', 'Myth', 'History', 'Future', 'Past', 'Present', 'Today',
    'Tomorrow', 'Yesterday', 'Morning', 'Evening', 'Afternoon', 'Night', 'Dawn',
    'Dusk', 'Midnight', 'Noon', 'Hour', 'Minute', 'Second', 'Year', 'Month', 'Week',
    'Journey', 'Adventure', 'Quest', 'Mission', 'Task', 'Job', 'Work', 'Career',
    'Life', 'Death', 'Birth', 'Wedding', 'Funeral', 'Party', 'Event', 'Meeting',
    'Conversation', 'Talk', 'Speech', 'Lecture', 'Lesson', 'Class', 'Course',
    'Education', 'Schooling', 'Training', 'Practice', 'Exercise', 'Game', 'Sport',
    'Competition', 'Contest', 'Race', 'Match', 'Battle', 'War', 'Fight', 'Conflict',
    'Dispute', 'Argument', 'Debate', 'Discussion', 'Plan', 'Strategy', 'Tactic',
    'Method', 'Approach', 'Technique', 'Process', 'Procedure', 'System', 'Network',
    'Connection', 'Relationship', 'Bond', 'Link', 'Tie', 'Association', 'Alliance',
    'Coalition', 'Union', 'Federation', 'Organization', 'Company', 'Corporation',
    'Business', 'Enterprise', 'Firm', 'Agency', 'Institution', 'Establishment',
    'Foundation', 'Institute', 'Academy', 'University', 'College', 'Department',
    'Division', 'Section', 'Branch', 'Unit', 'Team', 'Group', 'Crew', 'Squad',
    'Battalion', 'Regiment', 'Brigade', 'Division', 'Corps', 'Army', 'Navy',
    'Air Force', 'Marines', 'Coast Guard', 'Police', 'Fire Department', 'EMS',
    'Hospital', 'Clinic', 'Doctor', 'Nurse', 'Patient', 'Treatment', 'Therapy',
    'Medicine', 'Drug', 'Pill', 'Vitamin', 'Supplement', 'Diet', 'Nutrition',
    'Exercise', 'Fitness', 'Health', 'Wellness', 'Illness', 'Disease', 'Condition',
    'Symptom', 'Sign', 'Diagnosis', 'Prognosis', 'Recovery', 'Healing', 'Cure',
    'Remedy', 'Treatment', 'Therapy', 'Surgery', 'Operation', 'Procedure', 'Test',
    'Exam', 'Checkup', 'Screening', 'Vaccination', 'Immunization', 'Shot', 'Injection',
    // Pronouns that shouldn't be considered names
    'I', 'Me', 'My', 'Mine', 'Myself', 'You', 'Your', 'Yours', 'Yourself', 'Yourselves',
    'He', 'Him', 'His', 'Himself', 'She', 'Her', 'Hers', 'Herself', 'It', 'Its', 'Itself',
    'We', 'Us', 'Our', 'Ours', 'Ourselves', 'They', 'Them', 'Their', 'Theirs', 'Themselves',
    // Reflexive pronouns that shouldn't be considered names
    'Myself', 'Yourself', 'Yourselves', 'Himself', 'Herself', 'Itself', 'Ourselves', 'Themselves'
  ]);

  const lowerStopWords = new Set([...stopWords].map(w => w.toLowerCase()));

  // Patterns that typically introduce names - more restrictive to avoid false positives
  const namePatterns = [
    /(?:meet|see|called|named)\s+([A-Z][a-z]+)/gi,
    /(?:the\s+)?(?:man|woman|person|child|boy|girl|guy|lady|gentleman|stranger|figure|character|individual|being)\s+(?:was|is|called|named)\s+([A-Z][a-z]+)/gi,
    /([A-Z][a-z]+)\s+(?:the\s+)?(?:man|woman|person|child|boy|girl|guy|lady|gentleman|stranger|figure|character|individual|being)/gi,
    /(?:introduce|introduces|introduced)\s+(?:myself|himself|herself|itself|themselves)\s+as\s+([A-Z][a-z]+)/gi,
    /(?:my|his|her|their)\s+name\s+(?:is|was)\s+([A-Z][a-z]+)/gi,
    /(?:I\s+am|he\s+is|she\s+is|it\s+is|they\s+are)\s+([A-Z][a-z]+)/gi,
    /(?:greet|greets|greeted)\s+([A-Z][a-z]+)/gi,
    /(?:welcome|welcomes|welcomed)\s+([A-Z][a-z]+)/gi,
    /(?:approach|approaches|approached)\s+(?:by\s+)?([A-Z][a-z]+)/gi,
    /(?:join|joins|joined)\s+(?:by\s+)?([A-Z][a-z]+)/gi,
    /(?:speak|speaks|spoke)\s+(?:to\s+)?([A-Z][a-z]+)/gi,
    /(?:talk|talks|talked)\s+(?:to\s+)?([A-Z][a-z]+)/gi,
    /(?:converse|converses|conversed)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:chat|chats|chatted)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:discuss|discusses|discussed)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:argue|argues|argued)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:fight|fights|fought)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:battle|battles|battled)\s+(?:against\s+)?([A-Z][a-z]+)/gi,
    /(?:help|helps|helped)\s+([A-Z][a-z]+)/gi,
    /(?:save|saves|saved)\s+([A-Z][a-z]+)/gi,
    /(?:rescue|rescues|rescued)\s+([A-Z][a-z]+)/gi,
    /(?:protect|protects|protected)\s+([A-Z][a-z]+)/gi,
    /(?:defend|defends|defended)\s+([A-Z][a-z]+)/gi,
    /(?:attack|attacks|attacked)\s+([A-Z][a-z]+)/gi,
    /(?:kill|kills|killed)\s+([A-Z][a-z]+)/gi,
    /(?:murder|murders|murdered)\s+([A-Z][a-z]+)/gi,
    /(?:slay|slays|slew)\s+([A-Z][a-z]+)/gi,
    /(?:destroy|destroys|destroyed)\s+([A-Z][a-z]+)/gi,
    /(?:follow|follows|followed)\s+([A-Z][a-z]+)/gi,
    /(?:lead|leads|led)\s+([A-Z][a-z]+)/gi,
    /(?:guide|guides|guided)\s+([A-Z][a-z]+)/gi,
    /(?:teach|teaches|taught)\s+([A-Z][a-z]+)/gi,
    /(?:learn|learns|learned)\s+(?:from\s+)?([A-Z][a-z]+)/gi,
    /(?:love|loves|loved)\s+([A-Z][a-z]+)/gi,
    /(?:hate|hates|hated)\s+([A-Z][a-z]+)/gi,
    /(?:trust|trusts|trusted)\s+([A-Z][a-z]+)/gi,
    /(?:betray|betrays|betrayed)\s+([A-Z][a-z]+)/gi,
    /(?:friend|friends|friended)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:ally|allies|allied)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:enemy|enemies|enemied)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:rival|rivals|rivaled)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:companion|companions|companied)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:partner|partners|partnered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:spouse|spouses|spoused)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:husband|husbands|husbanded)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:wife|wives|wifed)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:father|fathers|fathered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:mother|mothers|mothered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:son|sons|sonned)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:daughter|daughters|daughtered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:brother|brothers|brothered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:sister|sisters|sistered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:uncle|uncles|uncled)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:aunt|aunts|aunted)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:cousin|cousins|cousined)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:nephew|nephews|nephewed)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:niece|nieces|nieced)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:grandfather|grandfathers|grandfathered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:grandmother|grandmothers|grandmothered)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:grandson|grandsons|grandsonned)\s+(?:with\s+)?([A-Z][a-z]+)/gi,
    /(?:granddaughter|granddaughters|granddaughtered)\s+(?:with\s+)?([A-Z][a-z]+)/gi
  ];

  // Accept lowercase names only in strong naming contexts
  const lowerNameContextPatterns = [
    // "... named bob", "... called bob"
    /(?:^|\b)(?:named|called)\s+([A-Za-z][a-z]+(?:[-'][A-Za-z][a-z]+)*)\b/gi,

    // "... my|his|her|their name is bob"
    /(?:^|\b)(?:my|his|her|their)\s+name\s+(?:is|was)\s+([A-Za-z][a-z]+(?:[-'][A-Za-z][a-z]+)*)\b/gi,

    // "... I am|I'm bob", "... He is|He's bob", "... They are|They're bob"
    /(?:^|\b)(?:I\s+am|I'm|He\s+is|He's|She\s+is|She's|They\s+are|They're)\s+([A-Za-z][a-z]+(?:[-'][A-Za-z][a-z]+)*)\b/gi,

    // "... introduces himself/herself/themselves as bob"
    /introduc(?:e|es|ed)\s+(?:myself|himself|herself|itself|themselves)\s+as\s+([A-Za-z][a-z]+(?:[-'][A-Za-z][a-z]+)*)\b/gi
  ];

  // Additional restrictive patterns to reduce false positives
  const restrictivePatterns = [
    /\b(?:begin|start|end|continue|pursue|undertake|embark\s+on)\s+this\s+([A-Z][a-z]+)\b/gi,
    /\b(?:begin|start|end|continue|pursue|undertake|embark\s+on)\s+(?:a|an|the)\s+([A-Z][a-z]+)\b/gi,
    /\b(?:introduce|refer)\s+(?:himself|herself|itself|themselves)\b/gi
  ];

  const potentialNames = new Set();

  // Check for names in restrictive patterns (to filter out false positives)
  const restrictiveMatches1 = new Set();
  const restrictiveMatches2 = new Set();
  for (const pattern of restrictivePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      // The name is typically in the last capturing group
      const name = match[match.length - 1];
      if (name) {
        restrictiveMatches1.add(name.toLowerCase());
        restrictiveMatches2.add(name.toLowerCase());
      }
    }
  }
  
  // Check for names in patterns
  for (const pattern of namePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      // The name is typically in the last capturing group
      const name = match[match.length - 1];
      if (name) {
        // Split into words and check each word
        const words = name.split(/\s+/);
        let validName = true;
        for (const word of words) {
          // Skip if word is a stop word or too short
          if (word.length < 2 || lowerStopWords.has(word.toLowerCase())) {
            validName = false;
            break;
          }
        }
        if (validName) {
          const allStopWords = words.every(w => lowerStopWords.has(w.toLowerCase()));
          if (allStopWords) {
            validName = false;
          }
        }
        // Additional check: make sure it's not in our restrictive patterns
        if (validName && !restrictiveMatches1.has(name.toLowerCase())) {
          potentialNames.add(name);
        }
      }
    }
  }

  // Additional pass: accept lowercase names in strong naming contexts
  for (const pattern of lowerNameContextPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const raw = match[1];
      if (!raw) continue;
      const candidate = normalizeNameCase(raw);

      const words = candidate.split(/\s+/);
      let validName = true;
      for (const word of words) {
        if (word.length < 2 || lowerStopWords.has(word.toLowerCase())) {
          validName = false;
          break;
        }
      }
      if (validName) {
        const allStopWords = words.every(w => lowerStopWords.has(w.toLowerCase()));
        if (allStopWords) validName = false;
      }

      // Exclude if the phrase is part of restrictive false-positive patterns
      if (validName && !restrictiveMatches1.has(candidate.toLowerCase()) && !restrictiveMatches2.has(candidate.toLowerCase())) {
        potentialNames.add(candidate);
      }
    }
  }

  // Check for names in restrictive patterns (to filter out false positives)
  for (const pattern of restrictivePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      // The name is typically in the last capturing group
      const name = match[match.length - 1];
      if (name) {
        restrictiveMatches2.add(name.toLowerCase());
      }
    }
  }
  
  // Also check for capitalized words that might be names (more conservative)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
  for (const word of capitalizedWords) {
    // Check if it's not a stop word and is reasonably long
    if (word.length >= 2 && !lowerStopWords.has(word.toLowerCase())) {
      // Additional check: see if it appears in a context that suggests it's a name
      const contextPattern = new RegExp(`(?:meet|see|called|named)\\s+${word}`, 'gi');
      if (contextPattern.test(text)) {
        // Additional check: make sure it's not in our restrictive patterns
        if (!restrictiveMatches2.has(word.toLowerCase())) {
          potentialNames.add(word);
        }
      }
    }
  }
  
  return Array.from(potentialNames);
}

/**
 * Check if a name already has a storycard
 * @param {string} name - Name to check
 * @returns {boolean} True if name already has a storycard
 */
function hasStoryCardForName(name) {
  // Convert name to lowercase for comparison
  const lowerName = name.toLowerCase();
  
  // Check if any existing storycard has this name in its keys or title (exact match)
  return storyCards.some(card => {
    if (card.title && card.title.toLowerCase() === lowerName) {
      return true;
    }
    if (card.keys) {
      const keys = card.keys.toLowerCase().split(/[, ]+/);
      return keys.some(key => key === lowerName);
    }
    return false;
  });
}

/**
 * Generate a storycard for a character using AI prompting
 * @param {string} name - Name of the character
 * @param {string} context - Context for generating the storycard entry
 * @returns {Promise<string>} Generated storycard entry
 */
function generateCharacterStoryCardEntry(name, context) {
  // In a real implementation, this would use AI prompting through the context/output modifiers
  // For now, we'll return a placeholder that can be replaced by the AI-generated content
  return `A character named ${name}. First mentioned in the story context: ${context.substring(0, 100)}...`;
}

/**
 * Check if a storycard's triggers are mentioned in the given text
 * @param {Object} card - Storycard to check
 * @param {string} text - Text to search for triggers
 * @returns {boolean} True if any trigger is mentioned in the text
 */
function areCardTriggersMentioned(card, text) {
  if (!card || !card.keys || !text) {
    return false;
  }

  // Split the keys by comma to get individual triggers
  const triggers = card.keys.split(',').map(trigger => trigger.trim());

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Check each trigger to see if it matches the text
  for (const trigger of triggers) {
    const lowerTrigger = trigger.toLowerCase();

    // Check for exact match first
    if (lowerText.includes(lowerTrigger)) {
      return true;
    }

    // Also check if the first word matches (for multi-word triggers)
    const triggerWords = lowerTrigger.split(/\s+/);
    if (triggerWords.length >= 2) {
      // Check if the first word of the multi-word trigger appears in the text
      if (lowerText.includes(triggerWords[0])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get or create the WTG Cooldowns storycard
 * @returns {Object} WTG Cooldowns storycard
 */
function getCooldownCard() {
  let cooldownCard = storyCards.find(card => card.title === "WTG Cooldowns");
  if (!cooldownCard) {
    addStoryCard("WTG Cooldowns");
    cooldownCard = storyCards[storyCards.length - 1];
    cooldownCard.type = "system";
    cooldownCard.keys = ""; // Empty keys so it's not included in context
    cooldownCard.description = "Internal cooldown tracking for AI commands; no keys; not included in context";
  }
  return cooldownCard;
}

/**
 * Check if sleep command cooldown is active
 * @returns {boolean} True if sleep cooldown is active
 */
function isSleepCooldownActive() {
  if (!state.sleepAvailableAtTT || !state.turnTime) return false;
  const currentTT = state.turnTime;
  const availableTT = parseTurnTime(state.sleepAvailableAtTT);
  if (!availableTT) return false;
  return compareTurnTime(currentTT, availableTT) < 0;
}

/**
 * Check if advance command cooldown is active
 * @returns {boolean} True if advance cooldown is active
 */
function isAdvanceCooldownActive() {
  if (!state.advanceAvailableAtTT || !state.turnTime) return false;
  const currentTT = state.turnTime;
  const availableTT = parseTurnTime(state.advanceAvailableAtTT);
  if (!availableTT) return false;
  return compareTurnTime(currentTT, availableTT) < 0;
}

/**
 * Set sleep command cooldown
 * @param {Object} duration - Duration object with time units (e.g., {hours: 8})
 */
function setSleepCooldown(duration) {
  const availableTT = addToTurnTime(state.turnTime, duration);
  state.sleepAvailableAtTT = formatTurnTime(availableTT);
  state.sleepWakeTime = formatTurnTime(availableTT);
  updateCooldownCard();
}

/**
 * Set advance command cooldown
 * @param {Object} duration - Duration object with time units (e.g., {minutes: 5})
 */
function setAdvanceCooldown(duration) {
  const availableTT = addToTurnTime(state.turnTime, duration);
  state.advanceAvailableAtTT = formatTurnTime(availableTT);
  state.advanceEndTime = formatTurnTime(availableTT);
  updateCooldownCard();
}

/**
 * Clear all command cooldowns
 * @param {string} source - Source of the reset (for logging)
 */
function clearCommandCooldowns(source) {
  state.sleepAvailableAtTT = null;
  state.advanceAvailableAtTT = null;
  state.sleepWakeTime = null;
  state.advanceEndTime = null;
  updateCooldownCard();
}

/**
 * Update the WTG Cooldowns storycard with current cooldown information
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
 * Check for pending AI commands in cooldown card and apply time jumps if current time has passed initiation time + buffer
 */
function checkAndApplyPendingCommands() {
  const cooldownCard = getCooldownCard();
  if (!cooldownCard.entry) return;

  const lines = cooldownCard.entry.split('\n');
  let pendingSleepCommand = null;
  let pendingAdvanceCommand = null;
  let sleepInitiatedTT = null;
  let advanceInitiatedTT = null;

  for (const line of lines) {
    if (line.startsWith('Last sleep initiated:')) {
      const match = line.match(/Last sleep initiated: .* \(([^)]+)\)/);
      if (match) {
        sleepInitiatedTT = parseTurnTime(match[1]);
      }
    } else if (line.startsWith('Sleep command:')) {
      const match = line.match(/Sleep command: \((.+)\)/);
      if (match) {
        pendingSleepCommand = match[1];
      }
    } else if (line.startsWith('Last advance initiated:')) {
      const match = line.match(/Last advance initiated: .* \(([^)]+)\)/);
      if (match) {
        advanceInitiatedTT = parseTurnTime(match[1]);
      }
    } else if (line.startsWith('Advance command:')) {
      const match = line.match(/Advance command: \((.+)\)/);
      if (match) {
        pendingAdvanceCommand = match[1];
      }
    }
  }

  // Check if we should apply pending sleep command
  if (pendingSleepCommand && sleepInitiatedTT) {
    // Add 2 minute buffer to initiation time
    const bufferTT = addToTurnTime(sleepInitiatedTT, {minutes: 2});
    if (compareTurnTime(state.turnTime, bufferTT) >= 0) {
      // Apply the sleep command
      const commandMatch = pendingSleepCommand.match(/sleep\s+(\d+)\s+(\w+)/);
      if (commandMatch) {
        const amount = parseInt(commandMatch[1], 10);
        const unit = commandMatch[2].toLowerCase();

        let days = 0, hours = 0, minutes = 0;
        switch (unit) {
          case 'years': case 'year': days = amount * 365; break;
          case 'months': case 'month': days = amount * 30; break;
          case 'weeks': case 'week': days = amount * 7; break;
          case 'days': case 'day': days = amount; break;
          case 'hours': case 'hour': hours = amount; break;
          case 'minutes': case 'minute': minutes = amount; break;
        }

        if (days > 0 || hours > 0 || minutes > 0) {
          state.turnTime = addToTurnTime(state.turnTime, { days, hours, minutes });
          const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
          state.currentDate = currentDate;
          state.currentTime = currentTime;
          state.changed = true;

          // Clear the pending command from cooldown card
          cooldownCard.entry = cooldownCard.entry
            .replace(/Last sleep initiated: .*\n/, '')
            .replace(/Sleep command: .*\n/, '')
            .trim();
        }
      }
    }
  }

  // Check if we should apply pending advance command
  if (pendingAdvanceCommand && advanceInitiatedTT) {
    // Add 1 minute buffer to initiation time
    const bufferTT = addToTurnTime(advanceInitiatedTT, {minutes: 1});
    if (compareTurnTime(state.turnTime, bufferTT) >= 0) {
      // Apply the advance command
      const commandMatch = pendingAdvanceCommand.match(/advance\s+(\d+)\s+(\w+)/);
      if (commandMatch) {
        const amount = parseInt(commandMatch[1], 10);
        const unit = commandMatch[2].toLowerCase();

        let days = 0, hours = 0, minutes = 0;
        switch (unit) {
          case 'years': case 'year': days = amount * 365; break;
          case 'months': case 'month': days = amount * 30; break;
          case 'weeks': case 'week': days = amount * 7; break;
          case 'days': case 'day': days = amount; break;
          case 'hours': case 'hour': hours = amount; break;
          case 'minutes': case 'minute': minutes = amount; break;
        }

        if (days > 0 || hours > 0 || minutes > 0) {
          state.turnTime = addToTurnTime(state.turnTime, { days, hours, minutes });
          const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
          state.currentDate = currentDate;
          state.currentTime = currentTime;
          state.changed = true;

          // Clear the pending command from cooldown card
          cooldownCard.entry = cooldownCard.entry
            .replace(/Last advance initiated: .*\n/, '')
            .replace(/Advance command: .*\n/, '')
            .trim();
        }
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

  // Update storycards that have placeholder "Unknown" timestamps or default "01/01/1900" timestamps
  for (let i = 0; i < storyCards.length; i++) {
    const card = storyCards[i];

    // Skip system cards
    if (card.title === "WTG Data" || card.title === "Current Date and Time") {
      continue;
    }

    // Update timestamps that contain "Unknown" or "01/01/1900" (placeholder/default timestamps)
    if (card.entry && card.entry.includes("Discovered on")) {
      if (card.entry.includes("Unknown")) {
        // Replace the placeholder timestamp with the new one
        card.entry = card.entry.replace(/Discovered on \d{1,2}\/\d{1,2}\/\d{4}\s+Unknown/, `Discovered on ${timestamp}`);
      } else if (card.entry.includes("01/01/1900")) {
        // Replace default date timestamps with the new one
        card.entry = card.entry.replace(/Discovered on 01\/01\/1900\s+[\d:]+ [AP]M/, `Discovered on ${timestamp}`);
      }
    }
  }
}
