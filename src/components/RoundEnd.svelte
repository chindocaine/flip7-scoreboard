<script lang="ts">
  import { app, layout, setGame, setDialog, t } from '../lib/store.svelte';
  import * as E from '../lib/engine';

  const g = $derived(app.game);
  const last = $derived(g.history[g.history.length - 1]);
  const tot = $derived(E.totals(g));
  const order = $derived(g.players.map((_, i) => i).sort((a, b) => tot[b] - tot[a]));
  const decided = $derived(E.isDecided(g));
  const tiedAtTop = $derived(!decided && Math.max(...tot) >= g.target);
  const nextStarter = $derived(g.history.length % g.players.length);
  const label = (i: number) =>
    last.flip7[i] ? t('flip7') : ({ active: t('sActive'), stayed: t('sStayed'), busted: t('sBusted'), frozen: t('sFrozen') } as const)[last.status[i]];
  const cls = (i: number) => (last.flip7[i] ? 'flip7' : last.status[i]);
</script>

<div class="screen" class:tablet={layout.tablet}>
  <div class="top"><span class="pill">{t('roundFinished', { n: g.history.length })}</span>{#if layout.tablet}<span class="title">Flip 7 Scoreboard</span>{/if}<span></span></div>
  <div class="body scroll" style={layout.tablet ? 'padding:0 40px 16px' : ''}>
    {#if layout.tablet}
      <table>
        <thead><tr><th>{t('player')}</th>{#each g.history as _, k}<th>R{k + 1}</th>{/each}<th>{t('total')}</th><th></th></tr></thead>
        <tbody>
          {#each order as i}
            <tr>
              <td><b>{g.players[i]}</b></td>
              {#each g.history as h, k}<td class:add={k === g.history.length - 1}>{k === g.history.length - 1 ? '+' : ''}{h.scores[i]}</td>{/each}
              <td><b>{tot[i]}</b></td>
              <td><span class="st {cls(i)}">{label(i)}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="center muted">{t('roundPointsAdded')}</div>
      <div class="plist">
        {#each order as i}
          <button class="prow" onclick={() => setDialog({ t: 'fix', player: i })}>
            <span class="n">{g.players[i]}</span>
            <span class="st {cls(i)}">{label(i)}</span>
            <span class="s">+{last.scores[i]}</span>
            <span class="tot">{tot[i]}</span>
          </button>
        {/each}
      </div>
      <div class="muted center" style="font-size:12px">{t('sortedBy', { n: g.target })}</div>
    {/if}
    <div class="spacer"></div>
    {#if tiedAtTop}<div class="banner good">{t('tied')}</div>{/if}
    <div style={layout.tablet ? 'display:flex;gap:12px;justify-content:center;align-items:center' : 'display:contents'}>
      {#if layout.tablet}<button class="btn" style="width:200px" onclick={() => setDialog({ t: 'fix', player: order[0] })}>{t('fixScore')}</button>{/if}
      <button class="btn primary big" style={layout.tablet ? 'width:320px' : ''} onclick={() => setGame(E.nextRound(g))}>
        {decided ? t('finishGame') : t('startRound', { n: g.history.length + 1 })}
      </button>
    </div>
    {#if !decided}<div class="muted center" style="font-size:12px">{t('beginsRound', { name: g.players[nextStarter], n: g.history.length + 1 })}</div>{/if}
    {#if !layout.tablet}<button class="btn" onclick={() => setDialog({ t: 'fix', player: order[0] })}>{t('fixScore')}</button>{/if}
  </div>
</div>
