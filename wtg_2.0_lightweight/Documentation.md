# WTG 2.0 Lightweight Documentation

## Version: 1.0.3
Date: 2025-10-14

## Version History

### Version 1.0.3 (2025-10-14)
**Feature: Automatic Storycard [settime] Detection at Scenario Start**

**New Features**:
1. **Storycard [settime] Processing**: When a scenario first starts, the system now scans all storycards for `[settime]` commands. If found, the command is automatically processed to set the starting date and time, allowing the AI to immediately begin generating responses without showing the opening prompt.

2. **Command Removal**: After processing a `[settime]` command from a storycard, the command is automatically removed from the storycard entry to keep the story clean.

**How It Works**:
- At scenario start (action count ≤ 1), all storycards are scanned for `[settime date time]` commands
- Format: `[settime mm/dd/yyyy time]` (e.g., `[settime 08/15/2024 3:30 pm]`)
- Supports various date separators: `/`, `-`, `.`
- Supports both 2-digit and 4-digit years
- Time formats: `3:30 pm`, `3 pm`, `15:30`, etc.
- Once found and processed, the command is removed from the storycard
- The opening prompt is skipped, and the AI generates the first response immediately

**Use Case**:
This feature is perfect for scenarios where you want to pre-configure the starting time without requiring players to manually enter a `[settime]` command. Simply add `[settime 01/15/2025 8:00 am]` to any storycard entry in your scenario, and players can start playing immediately.

**Example**:
Create a storycard with entry:
```
[settime 12/25/2024 6:00 am]
It's Christmas morning in Victorian London...
```

When the scenario starts, the time is automatically set to December 25, 2024 at 6:00 AM, and the AI begins the story without showing the setup prompt.

**Files Modified**:
- `output copy.js`: Added storycard scanning and [settime] processing logic at scenario start

**Backup Created**: `Backup/wtg_2.0_lightweight_storycard_settime_detection_2025-10-14/`

---

### Version 1.0.2 (2025-10-08)
**Bug Fix: Storycard Update and System Message Format (Timestamp Injection Solution)**

**Issues Fixed**:
1. **Storycard Not Updating**: User commands ([sleep], [advance], [settime], [reset]) would update `state.currentDate` and `state.currentTime`, but the "Current Date and Time" storycard wouldn't update to reflect the changes.

2. **Bracketed Messages Ignored by AI**: System messages like `[Advanced 2 hours. New date/time: 08/08/2037 8:01 AM.]` were being ignored by the AI because they looked like user commands in brackets.

3. **Sleep Command Time Initialization**: When using `[sleep]` with Unknown time, the command wasn't properly initializing `startingTime`.

**Solution Implemented**:
Inject the turn time marker `[[00y00m00d06h01n00s]]` directly into system messages, reusing the existing timestamp detection mechanism:

1. **Input Hook**: Adds `[[turntime]]` marker to system messages (e.g., `[SYSTEM] You go to sleep... [[00y00m01d00h00n00s]]`)
2. **Context Hook**: Detects `[[turntime]]` in the last action and uses it directly without adding character-based time
3. **Changed Format**: System messages now use `[SYSTEM]` prefix instead of wrapping entire message in brackets

**Files Modified**:
- `input copy.js`: Added `[[turntime]]` markers to all command system messages, updated message format to `[SYSTEM]`
- `context copy.js`: Added check to use `[[turntime]]` from last action directly when present
- `output copy.js`: Cleaned up unnecessary pending change logic

**Backup Created**: `Backup/wtg_2.0_lightweight_storycard_update_fix_2025-10-08/`

### Version 1.0.1 (2025-10-08)
**Bug Fix: [sleep] Command Time Initialization**

**Issue**: When using the `[sleep]` command with an Unknown time, the command would set `state.currentTime` to "8:00 AM" but not update `state.startingTime`. This caused subsequent time calculations to fail because `computeCurrent()` would still use `startingTime='Unknown'` and return Unknown time.

**Fix**: Modified the `[sleep]` command to properly initialize time when transitioning from Unknown:
- Reset `state.turnTime` to zero before adding the sleep duration
- Set `state.startingTime` to "8:00 AM" when time is Unknown
- Allow `computeCurrent()` to calculate the correct time based on the new starting time
- This ensures future `[advance]` commands work correctly after using `[sleep]`

**Files Modified**:
- `input copy.js` (lines 34-43): Updated [sleep] command to initialize startingTime

**Backup Created**: `Backup/wtg_2.0_lightweight_sleep_advance_fix_2025-10-08/`

### Version 1.0.0 (2025-10-01)
Initial release of WTG 2.0 Lightweight

## Overview
WTG 2.0 Lightweight is a streamlined version of the World Time Generator that focuses exclusively on core time tracking and timestamp injection. This version removes all AI prompt injections, entity generation, and configuration options to provide a simple, efficient time tracking system.

## Purpose
This lightweight version is designed for users who want:
- Simple time tracking without complexity
- Automatic timestamp injection into storycards
- No AI prompt interference
- Minimal overhead and maximum performance
- Predictable, consistent behavior

## Core Features

### 1. Time Tracking
- **Turn Time**: Tracks elapsed time in years, months, days, hours, minutes, and seconds
- **Current Date and Time**: Maintains current in-story date and time
- **Fixed Rate**: Time advances at 1 minute per 700 characters (not configurable)
- **Turn Time Format**: Internal format `00y00m00d00h00n00s` for precision

### 2. Timestamp Injection
- **Automatic**: All storycards receive timestamps when first mentioned
- **Discovery Verbs**:
  - Characters: "Met on [date] [time]"
  - Locations: "Visited [date] [time]"
  - Others: "Discovered on [date] [time]"
- **No Manual Intervention**: Timestamps are added automatically

### 3. Commands
All commands are enclosed in brackets `[command]`:

#### [settime mm/dd/yyyy time]
Set the starting date and time for your adventure.
- **Format**: `[settime 06/15/2023 3:30 PM]`
- **Date**: mm/dd/yyyy or dd/mm/yyyy (auto-detected)
- **Time**: 12-hour format (3:30 PM) or 24-hour format (15:30)
- **Effect**: Resets turn time to zero and updates all existing timestamps

#### [advance N unit]
Manually advance time by a specified amount.
- **Format**: `[advance 5 hours]`, `[advance 2 days]`, `[advance 3 months]`
- **Units**: hours, days, months, years
- **Effect**: Advances time immediately

#### [reset]
Reset date and time to the most recent mention in story history.
- **Format**: `[reset]`
- **Effect**: Scans history for date/time mentions and resets to most recent

#### [sleep]
Natural language command to sleep to the next morning.
- **Format**: Include "end the day" in your action
- **Effect**: Sleep 6-9 hours with random minutes, wake up at 8:00 AM if next day

### 4. Current Date and Time Storycard
Special system storycard that displays:
```
Starting date: 06/15/2023
Starting time: 8:00 AM
Current date: 06/15/2023
Current time: 10:45 AM
Turn time: 00y00m00d02h45n00s
```

### 5. WTG Data Storycard (Adventure Erasing Detection)
Internal system storycard that tracks turn data for detecting when users jump back in adventure history:
- Stores action text and timestamp for each turn
- Used to detect adventure erasing (when action text doesn't match expected)
- Automatically cleans up future turn data when time jumps backward
- Not included in AI context (internal use only)

## What Was Removed (Compared to Full WTG 2.0)

### Removed Settings
- ❌ Time Duration Multiplier
- ❌ Disable Generated Character Cards
- ❌ Disable Generated Location Cards
- ❌ Disable Generated Character Card Deletion
- ❌ Debug Mode
- ❌ Enable Dynamic Time
- ❌ Disable WTG Entirely

### Removed Features
- ❌ AI prompt injection (no scratchpad, no entity formatting instructions)
- ❌ Character card generation from (parentheses)
- ❌ Location card generation from ((double parentheses))
- ❌ Triple parentheses description injection (((entity) description)))
- ❌ Entity deprecation system
- ❌ Generated entity tracking (characters/locations)
- ❌ Trigger detection and mention tracking
- ❌ Detailed turn data recording (simplified version kept)
- ❌ Adventure erasing detection (simplified version kept for time cleanup)
- ❌ AutoCards system
- ❌ AI-generated (sleep) and (advance) commands
- ❌ Cooldown system for AI commands
- ❌ Dynamic time factor (dialogue vs travel)
- ❌ Keyword similarity analysis
- ❌ Settings storycard
- ❌ Cooldowns storycard

### Removed Functions
- ❌ `getWTGSettingsCard()`
- ❌ `getWTGBooleanSetting()`
- ❌ `getDynamicTimeFactor()`
- ❌ `extractCharacterNames()`
- ❌ `extractKeywords()`
- ❌ `calculateKeywordSimilarity()`
- ❌ `sanitizeEntityName()`
- ❌ `normalizeKeysFor()`
- ❌ `findOrCreateCard()`
- ✅ `getTurnData()` - Simplified version kept
- ✅ `addTurnData()` - Simplified version kept
- ✅ `compareTurnTime()` - Kept for timestamp comparison
- ✅ `cleanupWTGDataCardByTimestamp()` - Kept for adventure erasing
- ✅ `cleanupStoryCardsByTimestamp()` - Kept for future timestamp removal
- ❌ All AutoCards functions
- ❌ All trigger tracking functions
- ❌ All cooldown functions
- ❌ All deprecation functions

## File Structure

### library copy.js (~740 lines)
Core time management functions:
- Time parsing and normalization
- Date/time calculations
- Turn time tracking
- Simplified turn data tracking (for adventure erasing detection)
- Storycard management (basic)
- Timestamp injection
- Timestamp cleanup functions

### input copy.js (156 lines)
User command processing:
- State initialization
- Command parsing ([settime], [advance], [reset])
- "[sleep]" detection
- Message generation

### context copy.js (~70 lines)
Context modifications:
- Adventure erasing detection (simplified)
- Turn time calculation based on character count
- Current date/time computation
- Turn data and timestamp cleanup
- Date/time injection into context

### output copy.js (~100 lines)
AI response processing:
- Turn time updates
- Turn data recording (simplified)
- Timestamp injection into storycards
- Current Date and Time card updates

**Total: ~1,065 lines** (vs 3,516 lines in full version - 70% reduction)

## Usage Instructions

### Initial Setup
1. Copy all 4 files into your AI Dungeon shared library
2. Start a new adventure or continue an existing one
3. Use `[settime mm/dd/yyyy time]` to set your starting date and time

### During Adventure
- Time automatically advances based on story length
- Timestamps are automatically added to all storycards
- Use commands as needed to adjust time
- Check "Current Date and Time" storycard to see current time

### Best Practices
- Set a starting time at the beginning of your adventure
- Use [advance] for intentional time jumps (travel, waiting)
- Use "[sleep]" when your character sleeps
- Use [reset] if time gets out of sync with story

## Technical Details

### Time Calculation
- **Base Rate**: 1 minute per 700 characters
- **Turn Time Storage**: Cumulative time since starting point
- **History Scanning**: Looks for `[[turntime]]` markers in history
- **Character Counting**: Counts characters between turn time markers

### Timestamp Format
- **Date**: mm/dd/yyyy (e.g., 06/15/2023)
- **Time**: hh:mm AM/PM (e.g., 3:45 PM)
- **Combined**: "Met on 06/15/2023 3:45 PM"

### System Storycards
- **WTG Data**: Stores simplified turn data for adventure erasing detection (not included in context)
- **Current Date and Time**: Displays current date/time and turn time

### Adventure Erasing Detection
- When user jumps back in history, the system detects action text mismatch
- Automatically cleans up turn data with timestamps from the "future"
- Removes timestamps from storycards that are now in the future
- Maintains data integrity when navigating adventure history

## Comparison with Full Version

| Feature | Full WTG 2.0 | Lightweight |
|---------|-------------|-------------|
| Total Lines | 3,516 | ~1,065 |
| Settings | 7 | 0 |
| AI Prompts | Yes | No |
| Entity Generation | Yes | No |
| Time Multiplier | Configurable | Fixed (1.0) |
| Dynamic Time | Optional | No |
| Timestamp Injection | Yes | Yes ✓ |
| Basic Commands | Yes ✓ | Yes ✓ |
| Performance | Good | Excellent |

## Files Modified
- `wtg_2.0_lightweight/library copy.js`: Core time functions only
- `wtg_2.0_lightweight/input copy.js`: Basic command processing
- `wtg_2.0_lightweight/context copy.js`: Minimal time injection
- `wtg_2.0_lightweight/output copy.js`: Timestamp injection only
- `Backup/backup_labeling_standard.md`: Added lightweight backup conventions

## Known Limitations
- No configuration options (all behavior is fixed)
- No entity generation or tracking
- No AI prompt integration
- No dynamic time adjustment
- No deprecation system
- No trigger tracking
- Time rate cannot be adjusted

## Future Enhancements
This lightweight version is intentionally minimal. Any additional features should be carefully considered to maintain the lightweight philosophy. Potential enhancements:
- Optional time rate configuration (as single setting)
- Basic turn time marker visibility toggle
- Timestamp format customization

## Support
For questions or issues, refer to the main WTG documentation or compare behavior with the full WTG 2.0 version.