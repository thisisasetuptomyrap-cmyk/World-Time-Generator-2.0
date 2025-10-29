# WTG 2.0 Scenario Edition - Documentation

## Version: 2.2.5
Date: 2025-10-29

## Version History

### Version 2.2.5 (2025-10-29)
**Bug Fix: Back-to-Back Commands Time Addition**

**Issue Fixed**:
When using two commands back-to-back (e.g., `[sleep]` followed by `[advance]`), the second command was not properly adding time to the first command's result. This was the same bug that affected autocards+wtg 2.0.

**Root Cause**:
In `library.js` (line 403), the regex pattern had a `$` anchor at the end that prevented matching timestamp markers with trailing characters (like `. `).

**Solution Implemented**:
Removed the `$` anchor from the regex pattern to allow matching timestamp markers anywhere in the text.

**Files Modified**:
- `library copy.js`: Fixed regex in `getLastTurnTimeAndChars()` function (line 403)

**Impact**:
- Back-to-back commands now properly accumulate time
- Multiple commands in sequence maintain accurate time tracking

**Backup Created**: `Backup/wtg_2.0_scenario_2.2.5_back_to_back_command_fix_2025-10-29/`

---

### Version 2.2.4 (2025-10-28)
**Feature: Settime Initialization Tracking and Reliable Prompt Injection**

**New Features**:
1. **Settime Initialization Tracking**: The system now persists whether `[settime]` has been initialized via both `state.settimeInitialized` flag and the `WTG Data` storycard marker `[SETTIME_INITIALIZED]`. This prevents false positives where the default date (01/01/1900) is treated as valid.

2. **Reliable Prompt Injection**: The opening `[settime]` prompt is now reliably injected whenever:
   - The scenario starts with no prior `[settime]` command detected
   - The `settime` initialization flag has not been set
   - The script checks both state and storycard for this information

3. **Auto-Detection with Flag**: When `[settime]` is auto-detected from storycards at scenario start, the system immediately marks it as initialized, preventing the prompt from being shown unnecessarily.

4. **System Message Spacing Fix**: System messages from commands (like `[settime]`) now maintain proper spacing with periods. All messages follow the format: `[SYSTEM] Message text. [[turntime]]`

**How It Works**:
- **Input Hook**: 
  - Initializes `state.settimeInitialized = false` at adventure start
  - When user executes `[settime]` command, calls `markSettimeAsInitialized()`
  
- **Output Hook**:
  - Syncs the flag from storycard if not set in state: `hasSettimeBeenInitialized()`
  - Auto-detects `[settime]` in storycard entries and marks initialization
  - Injects prompt only if `!hasSettimeBeenInitialized()` AND time is still default
  
- **Library Functions**:
  - `hasSettimeBeenInitialized()`: Checks state flag first, falls back to storycard
  - `markSettimeAsInitialized()`: Writes flag to both state and WTG Data storycard

**Benefits**:
- Prevents false positives where default dates bypass the prompt
- Ensures prompt appears on scenario start if no settime is configured
- WTG Data storycard serves as backup persistence for initialization state
- Works reliably across scenario restarts and mode switches

**Compatibility**:
Works in both Lightweight and Normal modes.

**Files Modified**:
- `library copy.js`: Added `hasSettimeBeenInitialized()` and `markSettimeAsInitialized()` helper functions
- `input copy.js`: Initialize `state.settimeInitialized = false` on adventure start, call `markSettimeAsInitialized()` when processing `[settime]` command
- `output copy.js`: Sync flag from storycard, mark auto-detected `[settime]`, check initialization flag before injecting prompt

**Backup Created**: `Backup/wtg_2.0_scenario_settime_tracking_2025-10-28/`

---

### Version 2.2.3 (2025-10-14)
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

**Compatibility**:
Works in both Lightweight and Normal modes.

**Files Modified**:
- `output copy.js`: Added storycard scanning and [settime] processing logic at scenario start

**Backup Created**: `Backup/wtg_2.0_scenario_storycard_settime_detection_2025-10-14/`

---

### Version 2.2.2 (2025-10-08)
**Bug Fix: Storycard Update and System Message Format (Final Solution)**

**Issues Fixed**:
1. **Storycard Not Updating**: User commands ([sleep], [advance], [settime], [reset]) would update `state.currentDate` and `state.currentTime`, but the "Current Date and Time" storycard wouldn't update because changes made in the input hook don't persist to storycards reliably.

2. **Bracketed Messages Ignored by AI**: System messages like `[Advanced 2 hours. New date/time: 08/08/2037 8:01 AM.]` were being ignored by the AI because they looked like user commands in brackets.

3. **Sleep Command Time Initialization**: When using `[sleep]` with Unknown time, the command wasn't properly initializing `startingTime`.

**Solution Implemented**:
Inject the turn time marker `[[00y00m00d06h01n00s]]` directly into system messages, reusing the existing timestamp detection mechanism:

1. **Input Hook**: Adds `[[turntime]]` marker to system messages (e.g., `[SYSTEM] You go to sleep... [[00y00m01d00h00n00s]]`)
2. **Context Hook**: Detects `[[turntime]]` in the last action and uses it directly without adding character-based time
3. **Changed Format**: System messages now use `[SYSTEM]` prefix instead of wrapping entire message in brackets
4. **Fixed [sleep]**: Properly initializes `startingTime` to "8:00 AM" when transitioning from Unknown

**Files Modified**:
- `input copy.js`: Added `[[turntime]]` markers to all command system messages, updated message format to `[SYSTEM]`
- `context copy.js`: Added check to use `[[turntime]]` from last action directly when present (both modes)
- `library copy.js`: Removed unused pending change functions
- `output copy.js`: Removed unnecessary pending change check

**Backup Created**: `Backup/wtg_2.0_scenario_storycard_update_fix_2025-10-08/`

### Version 2.2.1 (2025-10-08)
**Bug Fix: [sleep] Command Time Initialization**

**Issue**: When using the `[sleep]` command with an Unknown time, the command would set `state.currentTime` to "8:00 AM" but not update `state.startingTime`. This caused subsequent time calculations to fail because `computeCurrent()` would still use `startingTime='Unknown'` and return Unknown time.

**Fix**: Modified the `[sleep]` command to properly initialize time when transitioning from Unknown:
- Reset `state.turnTime` to zero before adding the sleep duration
- Set `state.startingTime` to "8:00 AM" when time is Unknown
- Allow `computeCurrent()` to calculate the correct time based on the new starting time
- This ensures future `[advance]` commands work correctly after using `[sleep]`

**Files Modified**:
- `input copy.js` (lines 55-64): Updated [sleep] command to initialize startingTime

**Backup Created**: `Backup/wtg_2.0_scenario_sleep_advance_fix_2025-10-08/`

### Version 2.2.0 (2025-10-02)
Mode Switching Edition - Initial release

## Overview
This is a combined version of WTG 2.0 (Normal Mode) and WTG 2.0 Lightweight that allows users to switch between two operational modes on the fly. Both modes share the same core time management system but differ significantly in features and complexity.

## Key Features

### Mode Switching
- **[light]** command switches to Lightweight mode
- **[normal]** command switches back to Normal mode
- Mode persists across turns until manually changed
- Current mode is displayed in the "Current Date and Time" storycard

### Initial Setup Prompt
When starting a new adventure, users will see:
```
Please switch to story mode and use the command, [settime mm/dd/yyyy time] to set a custom starting date and time. (eg: [settime 01/01/1900 12:00 am])

To enable all of the features, use the command [normal]. You can go back to lightweight mode by using the command [light].

Lightweight mode is recommended for free users and llama models, as normal mode relies on the model's instruction following to generate characters and locations.

To report bugs, message me on discord: thedenial. (it has a period at the end of it)
```

## Mode Comparison

| Feature | Normal Mode | Lightweight Mode |
|---------|-------------|------------------|
| **Entity Detection** | ✅ Automatic from (parentheses) | ❌ Disabled |
| **AI Prompt Injection** | ✅ Entity formatting instructions | ❌ None |
| **Character Cards** | ✅ Auto-generated | ❌ Manual only |
| **Location Cards** | ✅ Auto-generated | ❌ Manual only |
| **AI Time Commands** | ✅ (sleep/advance) with cooldowns | ❌ Disabled |
| **Settings Card** | ✅ Configurable | ❌ No settings |
| **Time Multiplier** | ✅ Configurable | ❌ Fixed at 1.0 |
| **Dynamic Time** | ✅ Optional | ❌ Always fixed |
| **Debug Mode** | ✅ Available | ❌ Not available |
| **Entity Deprecation** | ✅ Optional | ❌ Not applicable |
| **Cooldown System** | ✅ For AI commands | ❌ Not applicable |
| **Timestamp Injection** | ✅ Automatic | ✅ Automatic |
| **Basic Commands** | ✅ [settime], [advance], [reset], [sleep] | ✅ [settime], [advance], [reset], [sleep] |
| **Turn Data Tracking** | ✅ Detailed | ✅ Simplified |
| **Adventure Erasing Detection** | ✅ Advanced | ✅ Basic |

## Commands

### Multiple Commands
Commands can be combined in a single action for convenience. For example:
- `[light] [settime 08/08/2022 6:00 am]` - Switch to lightweight mode and set starting time
- `[normal] [advance 2 hours]` - Switch to normal mode and advance time
- Commands are processed in sequence from left to right

### Mode Switching Commands
- **[light]** - Switch to Lightweight mode (disables all advanced features)
- **[normal]** - Switch to Normal mode (enables all advanced features)

### Time Management Commands
- **[settime mm/dd/yyyy time]** - Set starting date and time
  - Example: `[settime 06/15/2023 3:30 PM]`
  - Clears all cooldowns (Normal mode only)
  - Updates all existing storycard timestamps
  
- **[advance N unit]** - Manually advance time
  - Example: `[advance 5 hours]`, `[advance 2 days]`
  - Units: hours, days, months, years
  - Sets 5-minute cooldown in Normal mode
  
- **[sleep]** - Sleep to next morning
  - Sleeps 6-9 hours with random minutes
  - Wakes up at 8:00 AM if next day
  - Sets 8-hour cooldown in Normal mode
  
- **[reset]** - Reset to most recent date/time mention in history
  - Clears all cooldowns (Normal mode only)

## Normal Mode Features

### Automatic Entity Detection
**Characters** - Single parentheses: `(CharacterName)`
- Example: "A warrior named (Marcus) approached"
- Automatically creates character storycards

**Locations** - Double parentheses: `((LocationName))`
- Example: "You entered ((The Golden Tavern))"
- Automatically creates location storycards

**Descriptions** - Triple parentheses: `(((Entity) description)))`
- Example: "(((Marcus) tall warrior with silver armor)))"
- Injects description into existing storycard

### AI Time Commands (with Dynamic Time enabled)
**Sleep Command**: `(sleep X units)`
- AI can initiate sleep when player indicates sleeping
- 8-hour cooldown after use
- Example: "(sleep 8 hours) You drift off to sleep..."

**Advance Command**: `(advance X units)`
- AI can advance time for travel, waiting, etc.
- 5-minute cooldown after use
- Example: "(advance 2 hours) The journey continues..."

**Cooldown System**:
- Prevents AI from spamming time commands
- Cooldowns tracked in "WTG Cooldowns" storycard
- Instructions to AI change during cooldowns
- Commands automatically rejected if on cooldown

### Settings
**World Time Generator Settings** storycard allows configuration and adapts based on mode:

**Lightweight Mode Settings:**
```
Time Duration Multiplier: 1.0
Debug Mode: false
Disable WTG Entirely: false
```

**Normal Mode Settings:**
```
Time Duration Multiplier: 1.0
Enable Generated Character Cards: true
Enable Generated Location Cards: true
Disable Generated Card Deletion: true
Debug Mode: false
Enable Dynamic Time: true
Disable WTG Entirely: false
```

**Important**: This storycard has **no keys** and is not included in AI context, saving valuable context space for your story.

**Time Duration Multiplier**: Multiplier for base time progression
- Default: 1.0
- <1.0 slows time, >1.0 speeds up time
- Clamped to >= 0 to prevent backwards time

**Enable Generated Character Cards**: Auto-create cards for (CharacterName)
- true = enabled (default)
- false = disabled

**Enable Generated Location Cards**: Auto-create cards for ((LocationName))
- true = enabled (default)
- false = disabled

**Disable Generated Card Deletion**: Prevent deprecation of unused entities
- true = keep all generated cards forever
- false = deprecate cards when entities no longer detected

**Debug Mode**: Show/hide parentheses and commands
- true = show all formatting
- false = strip parentheses from display (default)

**Enable Dynamic Time**: AI time commands and adaptive time
- true = enabled (default)
- false = disabled

**Disable WTG Entirely**: Emergency off switch
- true = WTG completely disabled
- false = WTG active (default)

### Entity Deprecation (Normal Mode)
When "Disable Generated Card Deletion" is false:
- System scans current text and recent 5 actions
- Generated entities not detected are marked as "deprecated"
- Deprecated cards lose their keys and timestamps
- Helps keep storycard list manageable

## Lightweight Mode Features

### Fixed Time Rate
- Time advances at 1 minute per 700 characters
- No configuration options
- No settings storycard

### Simplified Turn Data
- Tracks action type, action text, and timestamp only
- No entity tracking
- No trigger mentions
- No AI command tracking

### Manual Entity Management
- No automatic entity detection
- Users must manually create and manage storycards
- All storycards receive automatic timestamps when first mentioned

### No AI Interference
- No prompt injection
- No formatting instructions
- AI unaware of WTG system
- Pure time tracking only

## Technical Details

### Time Calculation

**Normal Mode**:
- Base rate: 1 minute per 700 characters
- Modified by Time Duration Multiplier setting
- Adjusted by keyword similarity (0.7x for high similarity, 1.3x for low similarity)
- Optionally modified by Dynamic Time factor

**Lightweight Mode**:
- Fixed rate: 1 minute per 700 characters
- No adjustments or modifiers

### Turn Time Format
Internal format: `00y00m00d00h00n00s`
- Example: `00y00m05d12h30n00s` = 5 days, 12 hours, 30 minutes

### Timestamp Format
- **Date**: mm/dd/yyyy (e.g., 06/15/2023)
- **Time**: hh:mm AM/PM (e.g., 3:45 PM)
- **Combined**: "Met on 06/15/2023 3:45 PM"

### System Storycards

**WTG Data** (Both modes):
- Stores turn data for adventure erasing detection
- Keys: "wtg_internal_data,do_not_include_in_context"
- Not included in AI context

**Current Date and Time** (Both modes):
- Displays current date, time, turn time, and mode
- Keys: "date,time,current date,current time,clock,hour"
- Included in AI context

**World Time Generator Settings** (Both modes):
- Configuration storycard (adapts to current mode)
- Keys: "" (empty - not included in AI context)
- For player configuration only, AI never sees it

**WTG Cooldowns** (Normal mode only):
- Tracks AI command cooldowns
- No keys (not included in context)
- Internal tracking only

### Adventure Erasing Detection

**Normal Mode** (Advanced):
- Keyword similarity check before cleanup
- Only cleans up if similarity < 0.1 (major story change)
- Marks all generated characters as "not discovered"
- Removes WTG Data for characters no longer detected
- Cleans up undiscovered character entries

**Lightweight Mode** (Basic):
- Detects action text mismatch
- Cleans up future turn data by timestamp
- No entity-specific logic

## Mode Switching Behavior

### Switching from Normal to Lightweight
When `[light]` command is used:
- All advanced features immediately disabled
- Settings storycard automatically strips down to 3 essential settings
- Entity detection stops
- AI prompt injection stops
- Cooldown system stops
- Time calculation switches to fixed rate
- Existing storycards remain unchanged
- Turn data switches to simplified format

### Switching from Lightweight to Normal
When `[normal]` command is used:
- All advanced features immediately enabled
- Settings storycard automatically expands to all 7 settings
- Entity detection begins
- AI prompt injection begins
- Cooldown system becomes active
- Time calculation uses configured settings
- Existing storycards remain unchanged
- Turn data switches to detailed format

### State Persistence
- Mode setting persists across turns
- State variable `state.wtgMode` tracks current mode
- Default mode is "lightweight" if not set
- Mode displayed in "Current Date and Time" storycard

## Best Practices

### Normal Mode Usage
1. Set starting time at adventure beginning with `[settime]`
2. Use `(CharacterName)` and `((LocationName))` when introducing entities
3. Let AI use time commands naturally (sleep/advance)
4. Adjust settings as needed for your story pace
5. Enable Debug Mode to see how system works
6. Disable entity deletion if you want to keep all cards

### Lightweight Mode Usage
1. Set starting time at adventure beginning with `[settime]`
2. Use `[sleep]` command when your character sleeps
3. Use `[advance]` for intentional time jumps
4. Manually create all storycards
5. Keep story pacing in mind (1 min per 700 chars is very slow)
6. Use `[reset]` if time gets out of sync

### Mode Selection Guide

**Choose Normal Mode when you want:**
- Automatic entity tracking
- AI-assisted time management
- Rich storycard generation
- Advanced configuration options
- Dynamic time adjustments
- Entity deprecation

**Choose Lightweight Mode when you want:**
- Minimal system interference
- Manual control over everything
- Simple, predictable time tracking
- No AI prompt modification
- Maximum performance
- Clean, lightweight codebase

## Troubleshooting

### Entities Not Being Detected (Normal Mode)
- Check "Enable Generated Character Cards" setting
- Check "Enable Generated Location Cards" setting
- Verify AI is using parentheses format: (Name) or ((Location))
- Enable Debug Mode to see if parentheses are present
- AI may need explicit instruction to use formatting

### Time Not Advancing
- Verify starting time is set (not "Unknown")
- Check story has enough characters (700 chars = 1 minute)
- In Normal mode, check Time Duration Multiplier is not 0
- In Lightweight mode, time is intentionally slow

### Commands Not Working
- Commands must be in square brackets: `[command]`
- Commands must be on their own line or as entire input
- Check for typos in command names
- Some commands only work in specific modes

### Mode Switching Issues
- Mode switch takes effect immediately on next turn
- Check "Current Date and Time" storycard to verify mode
- Some features only work in their respective modes
- Existing storycards are not modified when switching modes

## Files Modified in This Version

### New Files Created
- `wtg_2.0_scenario/library copy.js`: Combined library with mode detection
- `wtg_2.0_scenario/input copy.js`: Input handler with [light]/[normal] commands
- `wtg_2.0_scenario/context copy.js`: Context handler with mode-specific logic
- `wtg_2.0_scenario/output copy.js`: Output handler with updated prompt and mode-specific processing
- `wtg_2.0_scenario/Documentation.md`: This file

### Source Files
Based on:
- `wtg_2.0/*`: Normal mode (version 2.1.21)
- `wtg_2.0_lightweight/*`: Lightweight mode (version 1.0.0)

## Version History

### Version 2.2.0 (2025-10-02)
- Combined Normal and Lightweight modes into single system
- Added `[light]` and `[normal]` mode switching commands
- Updated initial prompt with mode switching instructions and bug reporting contact
- Mode persists across turns until manually changed
- All functionality conditional based on current mode
- Both modes fully isolated - no feature bleeding between modes

## Support and Bug Reporting

To report bugs or issues, contact:
**Discord: thedenial.**
(Note: There is a period at the end of the username)

Include in your report:
- Current mode (Normal or Lightweight)
- Steps to reproduce the issue
- Expected vs actual behavior
- Relevant storycard contents if applicable
- Whether Debug Mode was enabled

## Future Enhancements

Potential future additions:
- Additional modes (minimal, custom, etc.)
- Mode-specific presets
- Auto-mode switching based on story type
- Custom time rates for Lightweight mode
- Mode-specific settings preservation
- Import/export of mode configurations

