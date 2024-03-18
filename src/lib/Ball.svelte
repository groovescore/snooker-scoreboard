<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (c) 2022 Jani Nikula <jani@nikula.org> -->
<script lang='ts'>
  export let value: number;
  export let action = () => {};
  export let active: boolean;
  export let title: string = '';
  import { value_to_csscolor } from './ball-colors';

  $: brightness = active ? '100%' : '50%'

  function onclick(): void {
    if (active)
      action()
  }
</script>

<div title='{title}' class='ball' style='--csscolor: {value_to_csscolor(value)}; --brightness: {brightness};' on:click={onclick}>
  <div class='value'><slot></slot></div>
</div>

<style>
  .ball {
    aspect-ratio: 1;
    border-radius: 50%;

    color: black;

    background-image: radial-gradient(circle at 66% 25%, white, var(--csscolor), black);

    filter: brightness(var(--brightness));
    -webkit-filter: brightness(var(--brightness)); /* https://caniuse.com/css-filters */
  }
  .value {
    text-shadow: 2px 2px black;
    color: white;
    text-align: center;
    font-size: 150%;
  }
</style>
