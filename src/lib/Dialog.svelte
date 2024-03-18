<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- SPDX-FileCopyrightText: 2024 Jani Nikula <jani@nikula.org> -->
<script>
  export let show;

  let dialog; // HTMLDialogElement

  $: if (dialog && show) dialog.showModal();

  $: if (dialog && !show) dialog.close();
</script>

<dialog bind:this={dialog} on:close={() => (show = false)} on:click={() => dialog.close()}>
  <slot />
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
