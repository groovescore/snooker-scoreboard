<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2024 Jani Nikula <jani@nikula.org> -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    show: boolean;
    children: Snippet;
  }

  let {
    show = $bindable(),
    children,
  }: Props = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (show)
      dialog.showModal();
    else
      dialog.close();
  });
</script>

<dialog bind:this={dialog} onclose={() => (show = false)} onclick={() => dialog.close()}>
  {@render children?.()}
</dialog>

<style>
  dialog {
    border: none;
    padding: 0;
    background: transparent;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.4);
  }
  dialog[open] {
    animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes zoom {
    from {
      transform: scale(0.5);
    }
    to {
      transform: scale(1);
    }
  }
  dialog[open]::backdrop {
    animation: fade 0.2s ease-out;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
