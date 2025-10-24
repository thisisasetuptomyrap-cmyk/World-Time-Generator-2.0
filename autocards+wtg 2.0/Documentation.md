# WTG 2.0 Lightweight + AutoCards Combined System

## Version: 1.0.4 Combined
Date: 2025-10-24

## Version History

### Version 1.0.4 (2025-10-24)
**Bug Fix: Timestamp Assignment - Keyword Detection**

**Issue Fixed**:
After using the `[settime]` command or during normal gameplay, all character and location storycards were receiving "discovered/met on" timestamps, even if they were never mentioned in the adventure. This caused storycards to be marked as discovered prematurely, cluttering the game state with cards that hadn't actually been encountered yet.

**Root Cause**:
In `output.js` (lines 206-218), the system was adding timestamps to ALL storycards that didn't have them, without checking if the storycard's keywords were actually mentioned in the adventure text. This was overly aggressive and didn't respect the intent of discovery-based timestamps.

**Solution Implemented**:
1. **Added `isCardKeywordMentioned()` Function**: New helper function in `library.js` that checks if any of a storycard's keywords are mentioned in the given text
   - Uses case-insensitive matching
   - Checks for whole word matches to avoid partial matches
   - Splits keywords by comma and tests each one

2. **Updated Timestamp Logic**: Modified `output.js` to only add timestamps when:
   - The card doesn't already have a timestamp AND
   - The card's keywords are mentioned in the combined text (player action + AI output)

3. **Combined Text Analysis**: Now analyzes both the player's action and the AI's output together to ensure keywords are actually present before stamping cards

**Code Changes**:
- **library.js**: Added `isCardKeywordMentioned(card, text)` function (lines 638-665)
- **output.js**: Updated timestamp assignment logic to use keyword detection (lines 205-221)

**Files Modified**:
- `library.js`: Added keyword detection function
- `output.js`: Updated timestamp assignment logic with keyword check

**Impact**:
- Storycards now only get timestamps when they are actually mentioned in the adventure
- Prevents premature "discovery" of entities that haven't been encountered yet
- More accurate tracking of when characters/locations were first introduced
- Cleaner game state with only relevant cards marked as discovered

**Backup Created**: `Backup/autocards_wtg_2.0_timestamp_fix_2025-10-24/`

**Note**: This same bug was present in all wtg 2.0 variants and has been fixed across the board:
- `wtg_2.0/` (Backup: `wtg_2.0_timestamp_fix_2025-10-24/`)
- `wtg_2.0_lightweight/` (Backup: `wtg_2.0_lightweight_timestamp_fix_2025-10-24/`)
- `wtg_2.0_scenario/` (Backup: `wtg_2.0_scenario_timestamp_fix_2025-10-24/`)

---

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
- `output.js`: Added storycard scanning and [settime] processing logic at scenario start

**Backup Created**: `Backup/wtg_autocards_storycard_settime_detection_2025-10-14/`

---

### Version 1.0.2 (2025-10-08)
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
- `input.js`: Added `[[turntime]]` markers to all command system messages, updated message format to `[SYSTEM]`
- `context.js`: Added check to use `[[turntime]]` from last action directly when present
- `library.js`: Removed unused pending change functions
- `output.js`: Removed unnecessary pending change check

**Backup Created**: `Backup/wtg_autocards_storycard_update_fix_2025-10-08/`

### Version 1.0.1 (2025-10-08)
**Bug Fix: [sleep] Command Time Initialization**

**Issue**: When using the `[sleep]` command with an Unknown time, the command would set `state.currentTime` to "8:00 AM" but not update `state.startingTime`. This caused subsequent time calculations to fail because `computeCurrent()` would still use `startingTime='Unknown'` and return Unknown time.

**Fix**: Modified the `[sleep]` command to properly initialize time when transitioning from Unknown:
- Reset `state.turnTime` to zero before adding the sleep duration
- Set `state.startingTime` to "8:00 AM" when time is Unknown
- Allow `computeCurrent()` to calculate the correct time based on the new starting time
- This ensures future `[advance]` commands work correctly after using `[sleep]`

**Files Modified**:
- `input.js` (lines 36-45): Updated [sleep] command to initialize startingTime

**Backup Created**: `Backup/wtg_autocards_sleep_advance_fix_2025-10-08/`

### Version 1.0.0 (2025-10-03)
Combined System - Initial release

## Overview

This is a combined system that merges **WTG 2.0 Lightweight** (World Time Generator) with **AutoCards** automatic storycard generation. The system ensures WTG runs first to maintain time consistency before AutoCards processes content.

## Core Components

### WTG 2.0 Lightweight
- **Time tracking**: Tracks elapsed time in years, months, days, hours, minutes, and seconds
- **Command processing**: Handles time-related commands ([settime], [advance], [reset], [sleep])
- **Timestamp injection**: Automatically adds timestamps to storycards
- **Adventure erasing detection**: Handles time jumps when navigating adventure history

### AutoCards
- **Automatic storycard generation**: Creates and updates plot-relevant story cards
- **Entity detection**: Identifies characters, locations, and other entities from story content
- **Memory management**: Maintains and compresses storycard memories
- **Configuration system**: Extensive customization options for card generation

## Execution Order

The combined system executes in this order to ensure compatibility:

1. **Input Hook**: WTG command processing → AutoCards title detection
2. **Context Hook**: WTG time injection → AutoCards context modifications
3. **Output Hook**: WTG timestamps → AutoCards card generation

## WTG Features

### Time Tracking
- **Turn Time**: Tracks elapsed time in `00y00m00d00h00n00s` format
- **Current Date/Time**: Maintains current in-story date and time
- **Character-based advancement**: 1 minute per 700 characters (fixed rate)
- **Automatic timestamp injection**: All storycards get discovery timestamps

### Commands (all enclosed in brackets `[command]`)

#### [settime mm/dd/yyyy time]
Set the starting date and time for your adventure.
- **Format**: `[settime 06/15/2023 3:30 PM]`
- **Date**: mm/dd/yyyy or dd/mm/yyyy (auto-detected)
- **Time**: 12-hour format (3:30 PM) or 24-hour format (15:30)
- **Effect**: Resets turn time to zero, updates all existing timestamps

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
- **Format**: Include "[sleep]" in your action
- **Effect**: Sleep 6-9 hours with random minutes, wake up at 8:00 AM if next day

### System Storycards
- **Current Date and Time**: Displays current date/time and turn time
- **WTG Data**: Stores turn data for adventure erasing detection (internal use only)

## AutoCards Features

### Automatic Storycard Generation
- **Entity Detection**: Automatically identifies and creates cards for characters, locations, etc.
- **Title Detection**: Scans story content for potential card titles
- **Memory Management**: Maintains compressed memories of card information
- **Cooldown System**: Prevents excessive card generation

### Configuration Options
AutoCards includes extensive configuration options via the "Configure Auto-Cards" storycard:
- **Generation Settings**: Card creation cooldown, entry limits, memory compression
- **Detection Settings**: Title detection from inputs, banned titles, look-back distance
- **Display Settings**: Bulleted list mode, debug data visibility
- **Advanced Settings**: Memory limits, compression ratios, interface options

### Manual Controls
- **API Functions**: Emergency halt, postpone events, toggle on/off
- **Card Management**: Regenerate, delete, or modify individual cards
- **Memory Updates**: Manually add or compress card memories

## Combined System Benefits

### Synergistic Features
1. **Time-Aware Card Generation**: AutoCards creates cards with accurate timestamps from WTG
2. **Context Integration**: WTG injects current date/time into context for AutoCards
3. **Consistent Timing**: WTG's time state is set before AutoCards processes content
4. **Enhanced Storycards**: Cards include both content and temporal information

### Compatibility
- **No Conflicts**: Both systems use separate state variables and storycard APIs
- **Preserved Functionality**: All features from both systems remain intact
- **Performance Optimized**: WTG Lightweight provides efficient time tracking

## Usage Instructions

### Initial Setup
1. Copy all 4 files into your AI Dungeon shared library:
   - `context.js`
   - `input.js`
   - `library.js`
   - `output.js`

2. Start a new adventure or continue an existing one
3. Use `[settime mm/dd/yyyy time]` to set your starting date and time
4. Configure AutoCards via the "Configure Auto-Cards" storycard (appears automatically)

### During Adventure
- **Time Management**: Time advances automatically based on story length
- **Command Usage**: Use WTG commands as needed to adjust time
- **Card Generation**: AutoCards automatically creates relevant storycards
- **Configuration**: Access AutoCards settings through the configuration card

### Best Practices
- Set a starting time at the beginning of your adventure
- Use [advance] for intentional time jumps (travel, waiting)
- Use "[sleep]" when your character sleeps
- Use [reset] if time gets out of sync with story
- Configure AutoCards settings to match your playstyle
- Review generated cards and edit them as needed

## Technical Details

### File Structure
- **library.js** (~6,700 lines): WTG functions + AutoCards function
- **input.js** (~160 lines): WTG commands → AutoCards input processing
- **context.js** (~70 lines): WTG time injection → AutoCards context processing
- **output.js** (~100 lines): WTG timestamps → AutoCards card generation

### Integration Points
- **State Management**: WTG uses `state.turnTime`, AutoCards uses separate state
- **Storycard API**: Both systems use compatible storycard creation methods
- **Return Values**: Properly chained between WTG and AutoCards processing
- **System Cards**: WTG's cards don't interfere with AutoCards functionality

### Performance Considerations
- WTG Lightweight: Minimal overhead, efficient time calculations
- AutoCards: Optimized with cooldowns and memory compression
- Combined System: Maintains performance while adding both feature sets

## Comparison with Individual Systems

| Feature | WTG Only | AutoCards Only | Combined |
|---------|----------|----------------|----------|
| Time Tracking | ✅ Full | ❌ None | ✅ Full |
| Timestamp Injection | ✅ Yes | ❌ None | ✅ Yes |
| Card Generation | ❌ None | ✅ Full | ✅ Full |
| Commands | ✅ Time | ❌ None | ✅ Time |
| Configuration | ❌ Minimal | ✅ Extensive | ✅ Extensive |
| Performance | ✅ Excellent | ✅ Good | ✅ Good |
| Setup Complexity | ✅ Simple | ✅ Moderate | ✅ Moderate |

## Troubleshooting

### Common Issues

**Time not advancing**: Ensure you've set a starting time with `[settime]`

**Cards not generating**: Check AutoCards cooldown settings in configuration card

**Timestamp conflicts**: WTG timestamps and AutoCards shouldn't conflict, but check configuration

**Performance issues**: Adjust AutoCards settings (increase cooldowns, reduce memory limits)

### Debug Information
- Check "Current Date and Time" storycard for WTG status
- Check "Configure Auto-Cards" storycard for AutoCards settings
- Enable AutoCards debug mode to see detailed generation logs

## Support

For questions or issues:
- WTG issues: Refer to original WTG documentation
- AutoCards issues: Check AutoCards configuration and settings
- Combined system: Test individual components separately to isolate issues

## Future Enhancements

The combined system maintains the lightweight philosophy:
- WTG time rate customization (optional single setting)
- AutoCards configuration presets
- Enhanced integration between time and card generation
- Additional timestamp formatting options

---

**Combined System Total**: ~6,930 lines (WTG ~670 + AutoCards ~6,000 + Integration ~260)
**Performance**: Excellent (WTG Lightweight) + Good (AutoCards) = Good combined
**Compatibility**: Full backward compatibility with both individual systems
