// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

import * as timeutil from './time-util.ts';
import { Options } from './Options.svelte.ts';
import { Player } from './Player.ts';
import { version } from '../../package.json';

export class State {
  // game
  readonly max_frames: number;
  private readonly max_balls: number;
  private break_off_pid: number = 0;
  num_frames: number = 0;
  private _game_over: boolean = false;
  version: string = version;

  // frame
  timestamp: number;
  private _start_timestamp: number = 0;
  private _end_timestamp: number = 0;
  private _shot_timestamp: number = 0;
  private _num_balls: number;

  private cur_pid: number = 0;
  private red: boolean = false;
  foul: boolean = false;
  respot_black: boolean = false;
  private _frame_over: boolean = false;

  private players: Player[] = [];

  private _copy(source: Object): void {
    // this will override players
    Object.assign(this, source);

    for (let i in this.players)
      this.players[i] = new Player(0, '', this.players[i]);
  }

  constructor(options: Options = null, source: Object = null) {
    if (options) {
      this.max_frames = options.num_frames > 0 ? options.num_frames : 0;
      this.max_balls = options.num_reds + 6;
      this._num_balls = this.max_balls;

      if (options.first_to_break == Options.RANDOM_FIRST_TO_BREAK)
	this.break_off_pid = Math.random() < 0.5 ? 0 : 1;
      else
	this.break_off_pid = options.first_to_break;

      this.cur_pid = this.break_off_pid;

      for (let pid of [0,1]) {
	let p: Player = new Player(pid, options.names[pid].name);

	this.players.push(p)
      }

      // frame
      this.timestamp = Date.now()
    } else if (source) {
      this._copy(source);
    }
  }

  deepcopy(): State {
    let source: Object = JSON.parse(JSON.stringify(this));

    return new State(null, source);
  }

  private _get_player_by_pid(pid: number, other: boolean = false): Player {
    for (let p of this.players) {
      // FIXME: simplify
      if (other) {
	if (p.pid != pid)
	  return p;
      } else {
	if (p.pid == pid)
	  return p;
      }
    }

    console.assert(false, 'player by pid ' + pid + ' not found');

    return null;
  }

  private _other_player_pid(): number {
    return (this.cur_pid + 1) % 2;
  }

  current_player(): Player {
    return this._get_player_by_pid(this.cur_pid);
  }

  other_player(): Player {
    return this._get_player_by_pid(this.cur_pid, true);
  }

  // All the statuses
  num_reds(): number {
    if (this._num_balls > 6)
      return this._num_balls - 6;
    else
      return 0
  }

  num_colors(): number {
    if (this._num_balls > 6)
      return 6;
    else
      return this._num_balls;
  }

  num_balls(value: number): number {
    if (value === 0)
      return this._num_balls;
    else if (value === 1)
      return this.num_reds();
    else if (this.num_colors() - (7 - value + 1) >= 0)
      return 1;
    else
      return 0;
  }

  num_points(): number {
    if (this.num_colors() === 0)
      return 0;

    const reds_and_blacks: number = this.num_reds() * (1 + 7);
    const colors: number = [2, 3, 4, 5, 6, 7].slice(-this.num_colors()).reduce((a, b) => a + b);

    return reds_and_blacks + colors;
  }

  get_players(): Player[] {
    return [...this.players];
  }

  // All the actions

  can_end_frame(): boolean {
    if (this._is_frame_over())
      return false;

    let player: Player = this.current_player();
    let other: Player = this.other_player();

    // can end frame if there's a point difference
    return player.points != other.points;
  }

  end_frame(): void {
    console.assert(this.can_end_frame());

    this._end_frame();
  }

  is_current_player(pid: number): boolean {
    if (this._is_frame_over())
      return false;

    return pid === this.cur_pid;
  }

  is_game_winner(pid: number): boolean {
    if (!this._game_over)
      return false;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare_frames(p2));
    return pid === players[1].pid;
  }

  is_frame_winner(pid: number): boolean {
    if (!this._is_frame_over())
      return false;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare_points(p2));
    return pid === players[1].pid;
  }

  private _has_frame_started(): boolean {
    return this._start_timestamp != 0;
  }

  private _detect_frame_over(): boolean {
    // snookers possible!
    if (this.num_colors() > 1)
      return false;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare_points(p2));

    return players[0].points + this.num_points() < players[1].points;
  }

  private _is_frame_over(): boolean {
    return this._frame_over;
  }

  get_frame_time(): string {
    let frame_time: number;

    if (this._is_frame_over())
      frame_time = this._end_timestamp - this._start_timestamp;
    else if (this._has_frame_started())
      frame_time = Date.now() - this._start_timestamp;
    else
      frame_time = 0;

    return timeutil.format_ms(frame_time);
  }

  private _log_shot(value: number): void {
    const now = Date.now();
    let shot_duration: number;

    if (this._has_frame_started()) {
      shot_duration = now - this._shot_timestamp;
    } else {
      // First shot, start the frame timer, use zero shot duration
      this._start_timestamp = now
      shot_duration = 0;
    }

    this._shot_timestamp = now;

    let p = this.current_player();
    p.log_shot(shot_duration, value);
  }

  private _end_turn(): void {
    let p: Player = this.current_player();
    p.end_turn();

    this.red = false;
    this.foul = false;
    this.respot_black = false;

    this.cur_pid = this._other_player_pid();

    // end frame or respot black?
    if (this._detect_frame_over()) {
      this._end_frame();
    } else if (this.num_colors() === 0) {
      this._num_balls++;
      this.respot_black = true;
    }
  }

  private _pot_points(points: number): void {
    this.foul = false;

    let p: Player = this.current_player();
    p.pot_points(points);

    if (this.num_points() === 0)
      this._end_turn();
  }

  private _can_pot_red(): boolean {
    // Note: Can pot two reds at a time!
    return this.num_reds() > 0;
  }

  private _pot_red(): void {
    console.assert(this._can_pot_red());

    this._num_balls--;
    this.red = true;

    this._pot_points(1);
  }

  private _can_pot_color(value: number): boolean {
    if (this.red)
      return true;

    if (this.num_reds() > 0)
      return false;

    return this.num_colors() - (7 - value + 1) === 0;
  }

  private _pot_color(value: number): void {
    console.assert(this._can_pot_color(value));

    if (this.num_reds() === 0 && !this.red)
      this._num_balls--;

    this.red = false;

    this._pot_points(value);
  }

  can_pot_ball(value: number): boolean {
    if (this._is_frame_over())
      return false;

    if (value === 1)
      return this._can_pot_red();
    else
      return this._can_pot_color(value);
  }

  pot_ball(value: number): void {
    console.log('pot ball: ' + value)

    this._log_shot(value);

    if (value === 1)
      this._pot_red();
    else
      this._pot_color(value);
  }

  can_commit_foul(value: number): boolean {
    if (this._is_frame_over())
      return false;

    return this.num_colors() - (7 - value + 1) >= 0;
  }

  commit_foul(value: number): void {
    console.assert(this.can_commit_foul(value));

    this._log_shot(-value);

    let player: Player = this.current_player();
    let other: Player = this.other_player();

    player.log_foul(value);
    other.points += value;

    // foul on last black, drop ball count to zero to cause end frame
    if (this.num_colors() === 1)
      this._num_balls--;

    this._end_turn();

    this.foul = true;
  }

  can_end_turn(): boolean {
    return !this._is_frame_over();
  }

  end_turn(): void {
    this._log_shot(0);
    this._end_turn();
  }

  private _end_frame(): void {
    this._end_timestamp = Date.now();

    this._frame_over = true;
    this.num_frames++;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare_points(p2));
    players[1].frame_wins++;
    if (this.max_frames && players[1].frame_wins >= (this.max_frames + 1) / 2)
      this._game_over = true;
  }

  can_new_frame(): boolean {
    return this._is_frame_over() && !this._game_over;
  }

  new_frame(): void {
    // frame
    this.timestamp = Date.now();
    this._start_timestamp = 0;
    this._end_timestamp = 0;
    this._shot_timestamp = 0;
    this._num_balls = this.max_balls;

    this.red = false;
    this.foul = false;
    this.respot_black = false;
    this._frame_over = false;

    for (let p of this.players) {
      p.new_frame();
    }

    this.break_off_pid = (this.break_off_pid + 1) % 2;
    this.cur_pid = this.break_off_pid;
  }

  can_plus_balls(): boolean {
    return !this._is_frame_over() && this._num_balls < this.max_balls;
  }

  plus_balls(): void {
    console.log('plus balls');
    console.assert(this.can_plus_balls());

    this._num_balls++;
  }

  can_minus_balls(): boolean {
    return !this._is_frame_over() && this._num_balls > 0;
  }

  minus_balls(): void {
    console.log('minus balls');
    console.assert(this.can_minus_balls());

    this._num_balls--;
  }

  can_player_edit_points(pid: number, amount: number): boolean {
    if (this._is_frame_over())
      return false;

    let p: Player = this._get_player_by_pid(pid);

    return p.points + amount >= 0;
  }

  player_edit_points(pid: number, amount: number): void {
    console.assert(this.can_player_edit_points(pid, amount));

    let p: Player = this._get_player_by_pid(pid);

    // FIXME: maybe don't adjust player points here directly
    p.points = p.points + amount;
  }
}
