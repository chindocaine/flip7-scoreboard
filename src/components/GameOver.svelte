<script lang="ts">
  import { app, setGame, t } from '../lib/store.svelte';
  import * as E from '../lib/engine';

  const g = $derived(app.game);
  const rank = $derived(E.ranking(g));
  const medal = (place: number) => ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[place] ?? String(place);
  const winners = $derived(rank.filter((r) => r.place === 1).map((r) => g.players[r.player]).join(' & '));

  const scratch = () => {
    app.setupNames = ['', ''];
    setGame({ phase: 'setup', target: g.target, players: [], history: [], round: null });
  };
</script>

<div class="screen">
  <div class="top"><span class="pill">{t('gameOver')}</span><span></span></div>
  <div class="body scroll">
    <div class="center" style="font-size:40px">🏆</div>
    <div class="center" style="font-size:22px;font-weight:800">{t('wins', { name: winners })}</div>
    <div class="plist">
      {#each rank as r}
        <div class="rank" class:first={r.place === 1}>
          <span class="pos" class:muted={r.place > 3}>{medal(r.place)}</span>
          <span class="n">{g.players[r.player]}</span>
          <span class="sc">{r.score}</span>
        </div>
      {/each}
    </div>
    <div class="spacer"></div>
    <button class="btn primary big" onclick={() => setGame(E.resetGame(g))}>{t('sameplayers')}</button>
    <button class="btn" onclick={scratch}>{t('scratch')}</button>
  </div>
</div>
