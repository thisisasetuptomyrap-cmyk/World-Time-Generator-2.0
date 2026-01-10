# World Time Generator (WTG) 2.0

> Advanced time tracking and entity management system for AI Dungeon scenarios

# Latest version: 2.1.24

Now with automatic storycard [settime] detection! Pre-configure your scenario's starting time without requiring players to manually enter commands by simply putting the [settime] command in any storycard within your scenario. The command will automatically be removed from the storycard.

## Table of Contents

- [Overview](#overview)
- [System Commands](#system-commands)
- [Storycard Markers](#storycard-markers)
- [Which Version Should I Use?](#which-version-should-i-use)
- [WTG 2.0 (Full Version)](#wtg-20-full-version)
- [WTG 2.0 Lightweight](#wtg-20-lightweight)
- [WTG 2.0 Scenario (Mode Switching)](#wtg-20-scenario-mode-switching)
- [Installation](#installation)
- [Quick Start Guide](#quick-start-guide)

---

## Overview

The World Time Generator (WTG) is a comprehensive scripting system for AI Dungeon that automatically tracks time progression and manages game entities throughout your adventure. Available in two versions to suit different needs.

### Key Features

- **Automatic Time Tracking**: Time advances based on story length
- **Persistent Date & Time**: Current date and time displayed in storycards
- **Entity Management**: Automatic storycard generation for characters and locations (Full version)
- **Adventure Erasing Detection**: Handles time jumps when rewinding story
- **Turn Data Tracking**: Records adventure history for consistency
- **Highly Configurable**: Multiple settings to customize behavior (Full version)

---

## System Commands

### Universal Commands (All Versions)

These commands work in all versions of WTG:

#### `[settime mm/dd/yyyy time]`
**Set starting date and time**

```
[settime 06/15/2023 8:00 AM]
[settime 12/25/2024 11:30 PM]
[settime 01/01/1900 12:00 am]
```

**NEW: Storycard [settime] Detection (v2.1.23)**
You can also add `[settime]` directly into any storycard entry! When the scenario starts, the script will automatically detect it, set the time, remove the command from the storycard, and skip the opening prompt.

**Example:**
```
[settime 12/25/2024 6:00 am]
It's Christmas morning in Victorian London...
```

#### `[advance N unit]`
**Jump forward in time**

```
[advance 5 hours]
[advance 2 days]
[advance 1 month]
[advance 3 years]
```
**Units:** hours, days, months, years

#### `[sleep]`
**Sleep to next morning**
- Advances 6-9 hours + random minutes
- Automatically sets time to next morning

```
[sleep]
```

#### `[reset]`
**Reset to most recent date/time mentioned in story**
- Scans recent history for date/time mentions
- Updates to the most recent found

```
[reset]
```

---

### Scenario Version Only

These additional commands are only available in **WTG 2.0 Scenario**:

#### `[normal]`
**Switch to Normal mode (full features)**
- Enables AI entity generation
- Enables AI-driven time commands
- Enables all configurable settings
- Enables advanced AI prompt injections

```
[normal]
```

#### `[light]`
**Switch to Lightweight mode**
- Disables AI entity generation
- Disables AI prompts
- Fixed time rate only
- Manual storycard control

```
[light]
```

#### **Combined Commands**
You can use multiple commands in a single action:

```
[light] [settime 08/08/2022 6:00 am]    # Set mode + time
[normal] [advance 2 hours]              # Switch mode + advance time
```

---

### AI-Generated Commands (Full Version Only)

When **Enable Dynamic Time** is enabled in the Full Version, the AI can trigger time commands:

#### `(sleep N units)`
**AI initiates sleep**
```
AI: You find a bed and (sleep 8 hours)...
```

#### `(advance N units)`
**AI advances time during narrative**
```
AI: The journey continued and (advance 3 days) later, you arrived...
```

These commands:
- Appear at the start of AI responses
- Are automatically processed by the script
- Are removed from the output (unless Debug Mode is enabled)
- Have cooldown periods to prevent spam
- **Units:** hours, minutes, days, weeks, months, years

---

## Storycard Markers

These markers can be placed inside storycard entries to control timestamp behavior.

### `[e]` - Exclusion Marker

**Exclude a storycard from timestamp injection**

Add `[e]` anywhere in a storycard's entry to permanently exclude it from receiving timestamps. The marker is removed when processed, and the card is added to a "WTG Exclusions" system storycard.

**Usage:**
```
Card Title: Important NPC
Keys: npc, character
Entry: This character should never have timestamps. [e]
```

**Result:**
- The `[e]` marker is removed from the entry
- Card title is added to WTG Exclusions
- No timestamps will ever be injected into this card

**Notes:**
- Case insensitive (`[e]` and `[E]` both work)
- Multiple `[e]` markers are all removed
- If combined with `/]`, the exclusion takes precedence

---

### `/]` - Custom Timestamp Placement

**Control where timestamps are inserted**

Add `/]` anywhere in a storycard's entry to specify where the timestamp should be inserted. The timestamp will be placed directly before `/]` (without a blank line), and the marker is removed after insertion.

**Usage:**
```
Card Title: Marcus the Warrior
Keys: marcus, warrior
Entry: A grizzled veteran with battle scars./]

Additional notes that should appear after the timestamp.
```

**Result (after timestamp injection):**
```
A grizzled veteran with battle scars.Met on 06/15/2023 8:00 AM

Additional notes that should appear after the timestamp.
```

**Notes:**
- If no `/]` marker is present, timestamps are appended at the end with a blank line separator (default behavior)
- The `/]` marker is removed after the timestamp is inserted
- Useful for keeping additional notes or formatting below the timestamp

---

## Which Version Should I Use?

**Overview**

The regular version of WTG 2.0 was tested primarly using Deepseek v3.1, so this script performs best with that model. The lightweight model is primarly for llama and other smaller models, as they have a hard time doing instruction following. Mixtral models can also work with the normal wtg scripts, but I haven't done rigorous testing with those models.

The Scenario version is just a convient way for mobile users to switch between either script. 

### Choose **WTG 2.0 (Full Version)** if you want:

**Automatic Entity Generation**
- AI automatically creates storycards for characters: `(CharacterName)`
- AI automatically creates storycards for locations: `((LocationName))`
- Description injection: `(((Entity) description text)))`

**Advanced Features**
- AI-driven time commands: `(sleep 8 hours)`, `(advance 2 days)`
- Configurable time multiplier for different story pacing
- Dynamic time adjustment based on action type
- Entity deprecation when no longer detected in the adventure.

### Choose **WTG 2.0 Lightweight** if you want:

**Simple & Clean**
- Just time tracking, nothing else
- No AI prompt interference
- Predictable, consistent behavior

**Performance**
- Minimal overhead
- Faster processing
- Less complexity

**Manual Control**
- You create all storycards manually
- AI never receives entity formatting instructions
- Pure time tracking without any entity features

### Choose **WTG 2.0 Scenario** if you want:

**Maximum Flexibility**
- Switch between full features and lightweight mode anytime
- Start simple, add features as needed
- Try different approaches in the same adventure

**Convenient Setup**
- Mode switching during play: `[normal]` or `[light]`
- Current mode always visible in time display

**Best of Both Worlds**
- Full WTG 2.0 features when you want them
- Lightweight performance when you need it
- Seamless transitions between modes

---

## WTG 2.0 (Full Version)

**Current Version**: 2.1.24

### Features

#### AI-Driven Entity Generation

The AI automatically formats entity names with parentheses, which triggers automatic storycard creation:

**Characters** (single parentheses):
```
"A warrior named (Marcus) approached the tavern."
Creates storycard for character "Marcus"

"(The Innkeeper) greeted you warmly."
Creates storycard for character "The Innkeeper"
```

**Locations** ((double parentheses)):
```
"You entered ((The Golden Tavern))."
Creates storycard for location "The Golden Tavern"

"The path led to ((Silverwood Forest))."
Creates storycard for location "Silverwood Forest"
```

**Descriptions** (((triple parentheses))):
```
"(((Marcus) A grizzled veteran with a scarred face)))"
Adds description to Marcus's storycard
```

#### Advanced Time Management

- **Base Time**: 1 minute per 700 characters (configurable multiplier)
- **Dynamic Time**: Adjusts based on keyword detection
  - Dialogue scenes: Slower time passage
  - Travel/waiting: Faster time passage
- **AI Commands**: AI can trigger time jumps with `(sleep X units)` or `(advance X units)`
- **Cooldown System**: Prevents AI from repeating time commands too frequently

#### Configuration Settings

Located in "World Time Generator Settings" storycard:

```
Time Duration Multiplier: 1.0          # Adjust time passage speed
Enable Generated Character Cards: true  # Toggle automatic character cards
Enable Generated Location Cards: true   # Toggle automatic location cards
Disable Generated Card Deletion: true   # Prevent card cleanup
Debug Mode: false                       # Show/hide parentheses in output
Enable Dynamic Time: true               # Enable smart time adjustment
Disable WTG Entirely: false            # Emergency disable switch
```

#### Scripts

- **input copy.js**: Processes player commands and input entity markers
- **context copy.js**: Injects AI instructions and manages time
- **output copy.js**: Processes AI output, detects entities, creates storycards
- **library copy.js**: Core utility functions and data management

### What Gets Created Automatically

1. **Character Storycards**: When AI mentions `(CharacterName)`
2. **Location Storycards**: When AI mentions `((LocationName))`
3. **Timestamps**: "Met on [date]" for characters, "Visited [date]" for locations
4. **WTG Data Card**: Internal tracking for turn data and adventure erasing
5. **Current Date and Time Card**: Displays current in-story time
6. **World Time Generator Settings**: Configuration options

---

## WTG 2.0 Lightweight

**Current Version**: 1.0.3

### Features

#### Pure Time Tracking

- **Fixed Rate**: 1 minute per 700 characters (not configurable)
- **Automatic Timestamps**: All storycards get discovery timestamps
- **No AI Prompts**: Zero interference with AI generation
- **No Entity Features**: You create all storycards manually

#### What This Version Does

1. **Tracks Time**: Maintains current date and time based on story length
2. **Adds Timestamps**: Automatically timestamps storycards when first mentioned
3. **Handles Commands**: Supports `[settime]`, `[advance]`, `[reset]`, `[sleep]`
4. **Detects Time Jumps**: Cleans up data when you rewind adventure
5. **Nothing Else**: No entity generation, no settings, no complexity

#### Scripts

- **input copy.js**: Processes player commands only
- **context copy.js**: Manages time progression (no AI instructions)
- **output copy.js**: Adds timestamps to storycards (no entity detection)
- **library copy.js**: Core time utility functions

### What You Need to Do Manually

1. Create all character storycards yourself
2. Create all location storycards yourself
3. Write all storycard content yourself
4. Update storycards as story progresses

### What Happens Automatically

1. Time advances based on story length
2. Current date/time updates each turn
3. Storycards receive timestamps when mentioned
4. Cleanup when you rewind adventure

---

## WTG 2.0 Scenario (Mode Switching)

This version combines both the full features of WTG 2.0 and the simplicity of Lightweight into a single system with **runtime mode switching**. You can toggle between Normal mode (full features) and Lightweight mode (minimal features) at any time during your adventure.

### Key Features

#### Mode Switching
- **[light]** - Switch to Lightweight mode (disables all advanced features)
- **[normal]** - Switch to Normal mode (enables all advanced features)
- **Mode Persistence**: Current mode saved across turns
- **Mode Display**: Current mode shown in "Current Date and Time" storycard

#### Normal Mode Features
When in Normal mode, you get all the full WTG 2.0 features:
- Automatic entity generation: `(CharacterName)`, `((LocationName))`
- AI-driven time commands: `(sleep 8 hours)`, `(advance 2 days)`
- Configurable settings and time multipliers
- Entity deprecation and cooldown systems
- All advanced AI prompt injections

#### Lightweight Mode Features
When in Lightweight mode, you get pure time tracking:
- No AI prompt interference or entity formatting instructions
- Manual storycard creation only
- Fixed time rate (1 minute per 700 characters)
- Automatic timestamps on all storycards
- Minimal system overhead

### Best For

**Choose WTG 2.0 Scenario if you want:**
- **Flexibility**: Switch between feature-rich and minimal modes as needed
- **Testing**: Try both approaches in the same adventure
- **Convenience**: Start with advanced features, switch to lightweight when needed
- **Performance**: Use lightweight mode for demanding scenarios
- **Migration**: Easy transition between full and lightweight approaches

### Example Usage

```
Initial Setup: [light] [settime 08/08/2022 6:00 am]
Result: Starts in lightweight mode with custom date/time

During Adventure: [normal]
Result: Switches to normal mode with all features enabled

For Performance: [light]
Result: Switches back to lightweight for faster processing
```

### Mode Switching Behavior

| Feature | Normal Mode | Lightweight Mode |
|---------|-------------|------------------|
| Entity Detection | ✅ AI creates `(Name)` and `((Location))` | ❌ Disabled |
| AI Prompts | ✅ Formatting instructions | ❌ None |
| Settings Card | ✅ Configurable options | ❌ Not used |
| Time Commands | ✅ AI can use `(sleep)`/`(advance)` | ❌ Disabled |
| Storycard Creation | ✅ Automatic | ❌ Manual only |
| Timestamps | ✅ Automatic | ✅ Automatic |
| Performance | Good | Excellent |

### Scripts

- **input copy.js**: Multi-command processing and entity markers by mode
- **context copy.js**: Mode-aware AI instructions and time management
- **output copy.js**: Mode-specific entity detection and storycard creation
- **library copy.js**: Combined functions for both modes
- **Documentation.md**: Comprehensive mode-switching documentation

### When to Switch Modes

**Use Normal Mode When:**
- You want automatic entity tracking
- AI should create storycards for characters/locations
- You need advanced time management features
- You're okay with AI receiving formatting instructions

**Use Lightweight Mode When:**
- You prefer manual control over storycards
- Performance is a priority
- You want minimal AI prompt interference
- You're creating storycards yourself

**Switch During Adventure:**
- Start in lightweight mode for initial setup
- Switch to normal mode once story is established
- Switch back to lightweight if performance becomes an issue
- Switch modes as your story needs change

---

## Installation

### For AI Dungeon Web

1. **Create or Edit a Scenario**
2. **Open Scripting** (bottom of Details tab)
3. **Copy Script Content**:
   - Copy `library copy.js` - Paste into **Library** script
   - Copy `input copy.js` - Paste into **Input** script
   - Copy `context copy.js` - Paste into **Context** script
   - Copy `output copy.js` - Paste into **Output** script
4. **Save** all scripts
5. **Start Adventure** and run `[settime 06/15/2023 8:00 AM]` to initialize

### Choosing Your Version

- **For Full Features**: Use files from the `wtg_2.0/` directory
- **For Lightweight**: Use files from the `wtg_2.0_lightweight/` directory
- **For Mode Switching**: Use files from the `wtg_2.0_scenario/` directory
- **Don't Mix**: Never mix scripts from different versions

---

## Quick Start Guide

### First Time Setup

1. **Start your adventure** from the scenario
2. **Set initial time** (required):
   ```
   [settime 06/15/2023 8:00 AM]
   ```
3. **Start playing!** Time will track automatically

### Using Full Version

After setup, the AI will automatically:
- Format character names: `(Marcus) drew his sword`
- Format locations: `You entered ((The Castle))`
- Create storycards for all entities
- Track time based on story events

**Example Flow:**
```
You: I enter the tavern looking for work.

AI: As you push through the heavy oak doors of ((The Rusty Anchor)), 
     the smell of ale and pipe smoke fills your nostrils. (Garth the 
     Barkeep) looks up from wiping down the counter and nods in your 
     direction.

Storycards created:
   - "The Rusty Anchor" (location)
   - "Garth the Barkeep" (character)
Time advanced by ~2 minutes
Current time updated
```

### Using Lightweight Version

After setup:
- Create storycards manually for important characters/locations
- Time tracks automatically
- Storycards get timestamps when their triggers are mentioned
- No entity formatting or AI instructions

### Using Scenario Version

After setup:
- **Default Mode**: Starts in Normal mode (full features)
- **Switch Modes**: Use `[light]` for lightweight, `[normal]` for full features
- **Combined Setup**: `[light] [settime 08/08/2022 6:00 am]` (set mode + time together)
- **Mode Display**: Check "Current Date and Time" storycard for current mode
- **Flexible Switching**: Change modes anytime during your adventure


## File Structure

```
├── wtg_2.0\                          # Full version
│   ├── context copy.js               # AI instructions & time
│   ├── input copy.js                 # Player commands & entities
│   ├── output copy.js                # Entity detection & cards
│   ├── library copy.js               # Core functions
│   └── Documentation.md              # Detailed documentation
│
├── wtg_2.0_lightweight\              # Lightweight version
│   ├── context copy.js               # Time management only
│   ├── input copy.js                 # Commands only
│   ├── output copy.js                # Timestamps only
│   ├── library copy.js               # Core functions
│   └── Documentation.md              # Lightweight docs
│
├── wtg_2.0_scenario\                 # Mode switching version
│   ├── context copy.js               # Mode-aware AI instructions
│   ├── input copy.js                 # Multi-command processing
│   ├── output copy.js                # Mode-specific entity detection
│   ├── library copy.js               # Combined functions
│   └── Documentation.md              # Mode-switching docs
│
├── Backup\                           # Version backups
│   └── [various backup folders]
│
└── README.md                         # This file
```

---

---

## Support & Bug Reports

**Developer**: thedenial. (with period)  
**Discord**: thedenial.  
**Date**: October 2025

For bug reports or feature requests, contact via Discord.

---

## Advanced Usage Tips

### Full Version Tips

1. **Debug Mode**: Enable to see parentheses in output for testing
2. **Time Multiplier**: Adjust to make time pass faster/slower
3. **Entity Deletion**: Disable to keep deprecated entities in storycards
4. **Dynamic Time**: Enable for smarter time passage based on action type

### Lightweight Tips

1. **Pre-create Important Cards**: Create storycards before starting
2. **Use Keys Wisely**: Ensure storycard keys match story mentions
3. **Check Timestamps**: Verify storycards receive timestamps correctly
4. **Manual Sleep**: Use `[sleep]` command when resting

---

## Troubleshooting

### Full Version Issues

**AI not using parentheses?**
- Check "Enable Generated Character Cards" setting
- Verify Debug Mode is false (set to true to see parentheses)
- Review AI Dungeon console logs for errors

**Too many entities created?**
- AI is being too generous with parentheses
- Consider using Lightweight version for manual control
- Or enable "Disable Generated Card Deletion" to keep all cards

**Time moving too fast/slow?**
- Adjust "Time Duration Multiplier" setting
- Enable/disable "Enable Dynamic Time" for automatic adjustment

### Lightweight Issues

**Storycards not getting timestamps?**
- Check that storycard keys match story mentions
- Verify card isn't a system card (WTG Data, Current Date and Time)
- Check console logs for errors

**Time not tracking?**
- Ensure you ran `[settime]` command first
- Check "Current Date and Time" storycard for current time
- Verify scripts are properly installed

### Both Versions

**Nothing working at all?**
- Verify all 4 scripts are copied correctly
- Check for JavaScript errors in console
- Ensure scenario allows scripting (Simple Start or Character Creator)
- Try `[settime]` command to initialize

---

## License & Credits

**Created by**: thedenial   
**License**: Apache 2.0

This is a community-created tool for enhancing AI Dungeon experiences. Not officially affiliated with Latitude (AI Dungeon creators).

---

**Made for the AI Dungeon community**

