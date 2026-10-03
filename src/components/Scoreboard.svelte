<script lang="ts">
  import { app, t } from '../lib/store.svelte';
  import * as E from '../lib/engine';

  const g = $derived(app.game);
  const r = $derived(g.round!);
  const tot = $derived(E.totals(g));
  const hands = $derived(E.preview(r));
  const cur = $derived(E.curPlayer(r));
  const stLabel = (i: number) =>
    i === cur ? t('sPlaying') : ({ active: t('sActive'), stayed: t('sStayed'), busted: t('sBusted'), frozen: t('sFrozen') } as const)[hands[i].status];
</script>

<div class="plist">
  {#each g.players as name, i}
    <div class="prow" class:cur={i === cur} class:out={hands[i].status !== 'active' && i !== cur}>
      <span class="n">{name}</span>
      <span class="st {i === cur ? 'playing' : hands[i].status}">{stLabel(i)}</span>
      <span class="s">{tot[i]} <em>+{E.scoreOf(hands[i])}</em></span>
    </div>
  {/each}
</div>
<div class="muted" style="font-size:12px">{t('nowDrawsNote', { n: g.target })}</div>
