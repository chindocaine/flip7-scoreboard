<script lang="ts">
  import { app, save, setGame, setDialog, t } from '../lib/store.svelte';
  import { startGame } from '../lib/engine';
  import Switches from './Switches.svelte';

  let rows: HTMLElement[] = $state([]);
  let dragging: number | null = $state(null);

  const down = (e: PointerEvent, i: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = i;
  };
  const move = (e: PointerEvent) => {
    if (dragging === null) return;
    for (let j = 0; j < rows.length; j++) {
      if (j === dragging) continue;
      const b = rows[j].getBoundingClientRect();
      const mid = b.top + b.height / 2;
      if ((j < dragging && e.clientY < mid) || (j > dragging && e.clientY > mid)) {
        const [item] = app.setupNames.splice(dragging, 1);
        app.setupNames.splice(j, 0, item);
        dragging = j;
        save();
        break;
      }
    }
  };
  const up = () => (dragging = null);

  const add = () => {
    app.setupNames.push('');
    save();
  };
  const remove = (i: number) => {
    app.setupNames.splice(i, 1);
    save();
  };
  const start = () => {
    const names = app.setupNames.map((n, i) => n.trim() || t('playerN', { n: i + 1 }));
    setGame(startGame(names, app.game.target));
  };
</script>

<div class="screen">
  <div class="top"><span class="title">Flip 7</span><Switches /></div>
  <div class="body">
    <button class="target" onclick={() => setDialog({ t: 'score' })}>
      <span>{t('firstToReach')}</span><span><b>{app.game.target}</b> <span class="muted">✎</span></span>
    </button>
    <div class="label">{t('playersInOrder')}</div>
    <div class="plist scroll">
      {#each app.setupNames as _, i (i)}
        <div class="prow" class:dragging={dragging === i} bind:this={rows[i]}>
          <span class="handle" role="presentation" onpointerdown={(e) => down(e, i)} onpointermove={move} onpointerup={up} onpointercancel={up}>⋮⋮</span>
          <input bind:value={app.setupNames[i]} oninput={save} placeholder={t('playerN', { n: i + 1 })} maxlength="20" />
          {#if app.setupNames.length > 2}<button class="rm" aria-label="Remove" onclick={() => remove(i)}>✕</button>{/if}
        </div>
      {/each}
      <button class="prow add" onclick={add}>{t('addPlayer')}</button>
    </div>
    <div class="spacer"></div>
    <button class="btn primary big" onclick={start}>{t('startGame', { n: app.setupNames.length })}</button>
  </div>
</div>
