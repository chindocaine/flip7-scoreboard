<script lang="ts">
  import { app, applyTheme } from './lib/store.svelte';
  import Setup from './components/Setup.svelte';
  import Turn from './components/Turn.svelte';
  import RoundEnd from './components/RoundEnd.svelte';
  import GameOver from './components/GameOver.svelte';
  import Dialogs from './components/Dialogs.svelte';

  $effect(() => {
    app.theme;
    app.lang;
    applyTheme();
  });
</script>

{#if app.game.phase === 'setup'}
  <Setup />
{:else if app.game.phase === 'play'}
  <Turn />
{:else if app.game.phase === 'roundEnd'}
  <RoundEnd />
{:else}
  <GameOver />
{/if}
<Dialogs />
