<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org> -->
<script lang='ts'>
  import { stopPropagation } from 'svelte/legacy';

  import { Fullscreen } from './lib/Fullscreen';
  import * as timeutil from './lib/time-util';
  import Ball from './lib/Ball.svelte';
  import Break from './lib/Break.svelte';
  import Dialog from './lib/Dialog.svelte';
  import { game } from './lib/Game';
  import { names } from './lib/Names.svelte.ts';
  import type Player from './lib/Player';
  import type { SaveGameId } from './lib/Game';
  import type { SavedName } from './lib/Names.svelte.ts';

  let fullscreen: Fullscreen = new Fullscreen(document.documentElement);

  function ui_toggle_fullscreen() {
    fullscreen.toggle();
  }

  // Hack to "live update" generic stuff once per second
  let __counter = $state(0);
  setInterval(() => __counter++, 1000)

  let live_update = $derived(function(thing: string): string {
    // Do something with __counter to react to changes
    let dummy = __counter;
    dummy = dummy
    return thing;
  })

  // ui pages
  const UiPage = {
    START: 0,
    PLAY: 1,
    EDIT: 2,
  };

  let ui_page = $state(UiPage.START);

  function ui_load_game(save_game: SaveGameId): void {
    if (!save_game.timestamp)
      return;

    // Note: Fullscreen can only be entered via user interaction
    fullscreen.load();

    game.load(save_game.slot);

    names.save();

    ui_page = UiPage.PLAY;
  }

  function ui_new_game(): void {
    if (!names.can_new_game())
      return;

    // Note: Fullscreen can only be entered via user interaction
    fullscreen.load();

    game.new_game(names.names);

    names.save();

    ui_page = UiPage.PLAY;
  }

  function ui_goto_start_page(): void {
    // FIXME: This can't just set ui_page = UiPage.START, because it messes up
    // current game and names etc. Until that's fixed, just reload.
    location.reload();
  }

  function ui_goto_play_page(): void {
    ui_page = UiPage.PLAY;
  }

  function ui_goto_edit_page(): void {
    ui_page = UiPage.EDIT;
  }

  // ui actions, each need to handle undo
  function ui_click_player(player: Player): void {
    // FIXME: don't duplicate the conditions here and in html
    if ($game.state.is_current_player(player.pid) && $game.state.can_end_turn())
      game.end_turn();
  }

  function ui_player_edit_points(pid: number, amount: number): void {
    if ($game.state.can_player_edit_points(pid, amount))
      game.edit_points(pid, amount);
  }

  function ui_new_frame(): void {
    if (!$game.state.can_new_frame())
      return;

    game.new_frame();

    ui_page = UiPage.PLAY;
  }

  function id_to_pos_style(id: number): string {
    if (id === 0)
      return 'left';
    else
      return 'right';
  }

  function ui_score_card_player_style(player: Player): string {
    let active: string = '';

    if ($game.state.is_current_player(player.pid))
      active = 'active';

    return `${active} ${id_to_pos_style(player.pid)}`;
  }

  function ui_name_input_card_style(sn: SavedName): string {
    let invalid: string = '';

    if (!names.valid_name(sn))
      invalid = 'invalid';

    return `${invalid} ${id_to_pos_style(sn.id)}`;
  }

  // UI key events

  let ui_key_modifier: string = null;
  let ui_key_modifier_timestamp: number = 0;

  function ui_key_modifier_set(value: string): void {
    ui_key_modifier = value;
    ui_key_modifier_timestamp = Date.now();
  }

  function ui_key_modifier_get(): string {
    let age_ms: number = Date.now() - ui_key_modifier_timestamp;
    let value: string = age_ms < 1000 * 5 ? ui_key_modifier : null;

    ui_key_modifier = null;
    ui_key_modifier_timestamp = 0;

    return value;
  }

  function ui_key_down(event: KeyboardEvent) {
    if (event.repeat)
      return;

    let modifier: string = ui_key_modifier_get();

    console.log(`key "${event.key}"`);

    // Any keypress in a dialog closes the dialog and gets ignored otherwise
    if (ui_close_dialogs())
      return;

    if (ui_page == UiPage.START)
      return;

    if (ui_page == UiPage.EDIT) {
      switch (event.key) {
	// keys specific to edit page
      case 'Escape':
	ui_goto_play_page();
	return;
	// keys accepted in both play and edit
      case 'z':
      case 'y':
      case '-':
      case '+':
	break;
	// the rest are ignored
      default:
	return;
      }
    }

    switch (event.key) {
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
      let value: number = parseInt(event.key);

      if (value >= 1 && value <= 7) {
	if (modifier == 'f') {
	  if (value >= 4) {
	    if ($game.state.can_commit_foul(value))
	      game.commit_foul(value);
	  }
	} else {
	  if ($game.state.can_pot_ball(value))
	    game.pot_ball(value);
	}
      }
      break;
    case 'Escape':
      if (ui_page == UiPage.EDIT)
	ui_goto_play_page();
      break;
    case ' ':
      if ($game.state.can_end_turn())
	game.end_turn();
      break;
    case 'z':
      if ($game.can_undo)
	game.undo();
      break;
    case 'y':
      if ($game.can_redo)
	game.redo();
      break;
    case 'f':
      ui_key_modifier_set(event.key);
      break;
    case '+':
      if ($game.state.can_plus_balls())
	game.plus_balls();
      break;
    case '-':
      if ($game.state.can_minus_balls())
	game.minus_balls();
      break;
    case 'n':
      if ($game.state.can_new_frame())
	game.new_frame();
      break;
    case 'm':
      ui_show_menu();
      break;
    case 's':
      ui_show_stats();
      break;
    case 'e':
      ui_goto_edit_page();
      break;
    }
  }

  let show_menu = $state(false);
  let show_stats = $state(false);

  function ui_show_menu() {
    show_menu = true;
  }

  function ui_show_stats() {
    show_stats = true;
  }

  function ui_close_dialogs(): boolean {
    if (!show_menu && !show_stats)
      return false;

    show_menu = false;
    show_stats = false;

    return true;
  }

  function ui_end_frame() {
    if ($game.state.can_end_frame())
      game.end_frame();
  }

</script>

<svelte:window onkeydown={ui_key_down} />

<main>
  {#if ui_page == UiPage.START}

    <div class='grid-container'>
      <div class='name-input-card middle {names.can_new_game() ? "" : "unavailable"}' onclick={ui_new_game}>
	<div class='info-card-copyright' onclick={stopPropagation(() => false)}><a href="https://groovescore.app">&copy; 2022-2024 Jani Nikula<br>License: AGPL 3.0 or later &#x1f517;</a></div>
	<div></div>
	<div>GrooveScore</div>
	<div>Snooker</div>
	<div>Scoreboard</div>
	<div></div>
	<div class='card-button'>New game</div>
      </div>
      {#each names.names as player_name (player_name.id)}
	<div class='name-input-card {ui_name_input_card_style(player_name)}'>
	  <input class='name-input' size=22 minlength=1 maxlength=22 placeholder='enter name' bind:value='{player_name.name}' onclick={stopPropagation(() => {})}/>
	  <div></div>
	  <div></div>
	  <div></div>
	  <div></div>
	  <div></div>
	  <div></div>
	</div>
      {/each}

      {#each $game.saved_games as save_game, index (save_game.slot) }
	<div class='info-card {save_game.timestamp ? "" : "unavailable"}' onclick={() => ui_load_game(save_game)}>
	  <div>Game save {index}</div>
	  <div></div>
	  {#if save_game.timestamp}
	    <div>Started</div>
	    <div>{timeutil.format_date(save_game.timestamp)}</div>
	    <div>{timeutil.format_time(save_game.timestamp)}</div>
	  {:else}
	    <div></div>
	    <div></div>
	    <div></div>
	  {/if}
	  <div></div>
	  <div class='card-button'>Load game</div>
	</div>
      {/each}

    </div>

  {:else if ui_page == UiPage.PLAY}
    <div class='grid-container'>
      <div class='score-card middle' onclick={ui_show_menu}>
	<div>{ live_update($game.state.get_frame_time()) }</div>
	<div>Frames ({$game.state.num_frames})</div>
	<div>
	  Points
	  <div>(Remaining {$game.state.num_points()})</div>
	</div>
	<div>Break</div>
	{#if $game.state.respot_black}
	  <div class='highlight'>re-spot black</div>
	{:else}
	  <div></div>
	{/if}
	<div class='card-button'>Menu</div>
      </div>
      {#each $game.state.get_players() as player (player.pid)}
	<div class='score-card {ui_score_card_player_style(player)}' onclick={() => ui_click_player(player)}>
	  <div>{player.name}</div>
	  <div>{player.frame_wins}</div>
	  <div class='score-card-points'>{player.points}</div>
	  {#if $game.state.is_current_player(player.pid)}
	    <div>{player.cur_break}</div>
	    <div class='score-card-break'><Break balls={player._cur_break}></Break></div>
	  {:else}
	    <div>({player.last_break})</div>
	    <div class='score-card-break unavailable'><Break balls={player._last_break}></Break></div>
	  {/if}
	  {#if $game.state.is_current_player(player.pid) && $game.state.can_end_turn()}
	    <div title='Shortcut: [space]' class='card-button'>End turn</div>
	  {:else if $game.state.is_winner(player.pid)}
	    <div class='highlight'>Frame Winner</div>
	  {:else}
	    <div></div>
	  {/if}
	</div>
      {/each}

      <div class='button-bar'>
	<div class='label'>Pot</div>
	{#each [1,2,3,4,5,6,7] as value}
	  <Ball title='Shortcut: {value}'
		value={value}
		active={$game.state.can_pot_ball(value)}
		action={() => game.pot_ball(value)}>
	    {value}
	  </Ball>
	{/each}
	<div class='label'></div>
      </div>

      <div class='button-bar'>
	<div class='label'>Undo</div>
	<Ball title='Shortcut: z'
	      value={0}
	      active={$game.can_undo}
	      action={() => game.undo()}>
	  &#x21b6;
	</Ball>
	<Ball title='Shortcut: y'
	      value={0}
	      active={$game.can_redo}
	      action={() => game.redo()}>
	  &#x21b7;
	</Ball>

	<div class='label'>Foul</div>
	{#each [4,5,6,7] as value}
	  <Ball title='Shortcut: f followed by {value}'
		value={0}
		active={$game.state.can_commit_foul(value)}
		action={() => game.commit_foul(value)}>
	    {value}
	  </Ball>
	{/each}
	<div class='label'></div>
      </div>
    </div>
  {:else}
    <div class='grid-container'>
      <div class='score-card middle' onclick={ui_goto_play_page}>
	<div>{ live_update($game.state.get_frame_time()) }</div>
	<div>Frames ({$game.state.num_frames})</div>
	<div>
	  Points
	  <div>(Remaining {$game.state.num_points()})</div>
	</div>
	<div>Break</div>
	<div></div>
	<div title='Shortcut: [ESC]' class='card-button'>Continue play</div>
      </div>
      {#each $game.state.get_players() as player (player.pid)}
	<div class='score-card {ui_score_card_player_style(player)}'>
	  <div>{player.name}</div>
	  <div>{player.frame_wins}</div>
	  <div class='score-card-points'>{player.points}</div>
	  {#if $game.state.is_current_player(player.pid)}
	    <div>{player.cur_break}</div>
	    <div class='score-card-break'><Break balls={player._cur_break}></Break></div>
	  {:else}
	    <div>({player.last_break})</div>
	    <div class='score-card-break unavailable'><Break balls={player._last_break}></Break></div>
	  {/if}
	  <div class='double-button'>
	    <div class='card-button' onclick={() => ui_player_edit_points(player.pid, -1)}>&ndash;</div>
	    <div class='card-button' onclick={() => ui_player_edit_points(player.pid, 1)}>+</div>
	  </div>
	</div>
      {/each}

      <div class='button-bar'>
	<div class='label'>Ball count</div>
	{#each [1,2,3,4,5,6,7] as value}
	  <Ball value={value}
		active={false}>
	    {$game.state.num_balls(value)}
	  </Ball>
	{/each}
	<div class='label'></div>
      </div>
      <div class='button-bar'>
	<div class='label'>Undo</div>
	<Ball title='Shortcut: z'
	      value={0}
	      active={$game.can_undo}
	      action={() => game.undo()}>
	  &#x21b6;
	</Ball>
	<Ball title='Shortcut: y'
	      value={0}
	      active={$game.can_redo}
	      action={() => game.redo()}>
	  &#x21b7;
	</Ball>
	<div class='label'></div>
	<div class='label'></div>
	<div class='label'>Adjust ball count</div>
	<Ball title='Shortcut: -'
	      value={0}
	      active={$game.state.can_minus_balls()}
	      action={() => game.minus_balls()}>
	  &ndash;
	</Ball>
	<Ball title='Shortcut: +'
	      value={0}
	      active={$game.state.can_plus_balls()}
	      action={() => game.plus_balls()}>
	  +
	</Ball>
	<div class='label'></div>
      </div>
    </div>

  {/if}

{#if ui_page != UiPage.START}
  <Dialog bind:show={show_menu}>
    <div class='dialog'>
      <div class='menu'>
	<div class='menu-column'>
	  <div title='Shortcut: s' class='menu-button' onclick={ui_show_stats}>Statistics</div>
	  <div title='Shortcut: e' class='menu-button' onclick={ui_goto_edit_page}>Edit</div>
	  <div title='Shortcut: FIXME' class='menu-button {$game.state.can_end_frame() ? "" : "unavailable"}' onclick={ui_end_frame}>End frame</div>
	  <div title='Shortcut: FIXME' class='menu-button {$game.state.can_new_frame() ? "" : "unavailable"}' onclick={ui_new_frame}>New frame</div>
	</div>
	<div class='menu-column'>
	  <div class='menu-button' onclick={ui_toggle_fullscreen}>Full screen</div>
	  <div class='menu-button' onclick={ui_goto_start_page}>Main screen</div>
	  <div class='menu-button unavailable'>Help</div>
	  <div class='menu-button unavailable'>Free ball</div>
	</div>
      </div>
    </div>
  </Dialog>

  <Dialog bind:show={show_stats}>
    <div class='dialog'>
      <div class='stats'>
	<div class='stats-column middle'>
	  <div class='stats-heading'>Player</div>
	  <div>&nbsp;</div>
	  <div class='stats-heading'>Game statistics</div>

	  <div>Frames ({$game.state.num_frames})</div>
	  <div>Highest break</div>
	  <div>Balls potted</div>
	  <div>Time since last pot</div>
	  <div>&nbsp;</div>

	  <div class='stats-heading'>Frame statistics</div>
	  <div>Highest break</div>
	  <div>Balls potted</div>
	  <div>Average shot time</div>
	</div>
	{#each $game.state.get_players() as player (player.pid)}
	  <div class='stats-column {id_to_pos_style(player.pid)}'>
	    <div class='stats-name'>{player.name}</div>
	    <div>&nbsp;</div>
	    <div>&nbsp;</div>

	    <div>{player.frame_wins}</div>
	    <div>{player.game_high_break}</div>
	    <div>{player.game_balls}</div>
	    <div>{live_update(player.time_since_last_pot)}</div>
	    <div>&nbsp;</div>

	    <div>&nbsp;</div>
	    <div>{player.frame_high_break}</div>
	    <div>{player.frame_balls}</div>
	    <div>{player.frame_shot_time}</div>
	  </div>
	{/each}
      </div>
    </div>
  </Dialog>
{/if}

</main>

<style>
  :root {
    background: black;
    color: white;
    font-family: sans-serif;
    /* https://css-tricks.com/fitting-text-to-a-container */
    font-size: 2vw;
    text-align: center;
    text-transform: uppercase;
  }

  .menu {
    display: grid;
    grid-template-columns: 3fr 3fr;
    grid-template-rows: auto auto;
    color: white;
  }

  .menu > * {
    background-color: #155843;
    border-style: solid;
    border-color: transparent;
    border-radius: 2vmin;
    border-width: 0.5vmin;
  }

  .menu-column {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
    gap: 2vmin;
  }

  .menu-button {
    background-image: linear-gradient(30deg, gray, white);
    border-radius: inherit;
    color: black;
  }

  .dialog {
    background-color: #155843;
    color: white;
    border-style: solid;
    border-color: transparent;
    border-radius: 2vmin;
    border-width: 0.5vmin;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto auto auto;
    text-transform: none;
  }

  .stats-column {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(12, 1fr);
  }

  .stats-name {
    text-transform: uppercase;
  }

  .stats-heading {
    font-weight: bold;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto auto auto;
    gap: 2vmin;
  }

  .grid-container > * {
    background-color: #155843;
    border-style: solid;
    border-color: transparent;
    border-radius: 2vmin;
    border-width: 0.5vmin;
  }

  .left {
    grid-row: 1;
    grid-column: 1;
  }

  .middle {
    grid-row: 1;
    grid-column: 2;
  }

  .right {
    grid-row: 1;
    grid-column: 3;
  }

  .name-input-card {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  }

  .name-input {
    /* FIXME: the height is too much */
    background-color: inherit;
    border-radius: 2vmin;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    text-align: inherit;
    text-transform: inherit;
  }

  .score-card {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr 3fr 1fr 1fr 1fr;
  }

  .double-button {
    display: grid;
    grid-template-columns: 50% 50%;
    grid-template-rows: 100%;
    border-radius: inherit;
  }

  .info-card {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  }

  .info-card-copyright {
    font-size: 40%;
  }

  a {
    color: inherit;
    text-decoration: inherit;
  }

  .score-card-points {
    font-size: 300%;
    font-weight: bold;
  }

  .score-card-break {
    overflow-x: hidden;
  }

  .card-button {
    background-image: linear-gradient(30deg, gray, white);
    border-radius: inherit;
    color: black;
  }

  .button-bar {
    grid-column: 1 / 4;
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: 1fr;
    gap: 2vmin;
    align-items: center;
  }

  .button-bar > * {
    overflow-x: hidden;
  }

  .active {
    border-color: white;
  }

  .invalid {
    border-color: red;
  }

  .highlight {
    font-weight: bold;
    color: orange;
  }

  .unavailable {
    filter: brightness(50%);
    -webkit-filter: brightness(50%); /* https://caniuse.com/css-filters */
  }
</style>
