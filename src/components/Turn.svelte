<script lang="ts">
  import { app, layout, setGame, setDialog, t } from '../lib/store.svelte';
  import * as E from '../lib/engine';
  import Scoreboard from './Scoreboard.svelte';

  const g = $derived(app.game);
  const r = $derived(g.round!);
  const p = $derived(E.curPlayer(r));
  const hands = $derived(E.preview(r));
  const hand = $derived(hands[p]);
  const gone = $derived(E.goneMods(r));
  const flip3 = $derived(E.inFlip3(r));
  const total = $derived(E.totals(g)[p]);
  const canDraw = $derived(hand.status === 'active');
  const name = (i: number) => g.players[i];

  const full = $derived(E.isFull(r));
  const selNum = (v: number) => r.sel.find((s) => s.k === 'n' && s.v === v);
  const numClass = (v: number) => {
    const s = selNum(v);
    if (s) return r.sel.some((x) => x.k === 'n' && x.v === v && x.dup === 'bust') ? 'sel dup' : 'sel';
    return r.hands[p].nums.includes(v) ? 'held' : '';
  };
  const modClass = (m: E.Mod) =>
    r.sel.some((s) => s.k === 'm' && s.v === m) ? 'sel' : r.hands[p].mods.includes(m) ? 'held' : gone.has(m) ? 'gone' : '';
  const actSel = (k: 'freeze' | 'flip3') => r.sel.find((s) => s.k === 'a' && s.v === k) as Extract<E.Sel, { k: 'a' }> | undefined;
  const scSel = $derived(r.sel.some((s) => s.k === 's'));

  const upd = (nr: E.Round) => setGame({ ...g, round: nr });
  const tapNum = (v: number) => {
    const res = E.tapNumber(r, v);
    if ('round' in res) upd(res.round);
    else if ('askSelDup' in res) setDialog({ t: 'selDup', n: v });
    else setDialog({ t: 'dup', n: v });
  };
  const tapMod = (m: E.Mod) => upd(E.tapMod(r, m));
  const tapAct = (k: 'freeze' | 'flip3') => {
    const res = E.tapAction(r, k);
    if ('round' in res) upd(res.round);
    else setDialog({ t: 'target', kind: k });
  };
  const tapSc = () => {
    const res = E.tapSecondChance(r);
    if ('round' in res) upd(res.round);
    else setDialog({ t: 'scgive' });
  };
  const next = () => setGame(E.confirmTurn(g));

  const remaining = $derived(Math.max(0, E.FLIP3_CARDS - r.sel.length));
  const nextLabel = $derived(
    flip3 ? (canDraw && remaining > 0 && !E.isFlip7(hand) ? t('contMore', { n: remaining }) : t('cont')) : t('next'),
  );
</script>

{#snippet play()}
  <div class="who">
    {#if flip3}
      <div class="sub" style="color:var(--accent)">{t('flip3From', { name: name(r.frames[0].from) })}</div>
    {:else}
      <div class="sub">{t('nowPlaying')}</div>
    {/if}
    <div class="name">{name(p)}</div>
    <div class="sub">
      {t('total')} {total} · {t('thisRound')} {E.scoreOf(hand)}
      {#if hand.sc}<span class="tag">{t('secondChanceTag')}</span>{/if}
    </div>
  </div>
  {#if flip3}
    <div class="dots">{'●'.repeat(Math.min(E.FLIP3_CARDS, r.sel.length))}{'○'.repeat(remaining)}</div>
  {/if}
  {#if hand.status === 'busted'}
    <div class="banner bad">{t('bustBanner', { n: hand.bustNum ?? '', name: name(p) })}</div>
  {:else if E.isFlip7(hand)}
    <div class="banner good">{t('flip7Banner')}</div>
  {/if}

  <div class="cards-row">
    <div>
      <div class="label">{t('number')}</div>
      <div class="grid {layout.tablet ? 'g7' : 'g5'}">
        {#each E.NUMBERS as v}
          <button class="num {numClass(v)}" disabled={(!canDraw || full) && !selNum(v)} onclick={() => tapNum(v)}>{v}</button>
        {/each}
      </div>
    </div>
    <div>
      <div class="label">{t('modifier')}</div>
      <div class="grid {layout.tablet ? 'g3' : 'g6'}">
        {#each E.MODS as m}
          <button class="mod-b {modClass(m)}" disabled={(!canDraw || full || gone.has(m)) && modClass(m) !== 'sel'} onclick={() => tapMod(m)}>
            {m === 'x2' ? '×2' : m}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="label">{flip3 ? t('actionQueued') : t('action')}</div>
  <div class="actions">
    <button class="act freeze" class:sel={actSel('freeze')} disabled={(!canDraw || full) && !actSel('freeze')} onclick={() => tapAct('freeze')}>
      ❄ {t('freeze')}{#if actSel('freeze')} → {name(actSel('freeze')!.target)}{/if}
    </button>
    <button class="act flip3" class:sel={actSel('flip3')} disabled={(!canDraw || full) && !actSel('flip3')} onclick={() => tapAct('flip3')}>
      ✋ {t('flip3')}{#if actSel('flip3')} → {name(actSel('flip3')!.target)}{/if}
    </button>
    <button class="act sc" class:sel={scSel} disabled={(!canDraw || full) && !scSel} onclick={tapSc}>♥ {t('secondChance')}</button>
  </div>
  <div class="spacer"></div>
  <div class="bottom">
    {#if !flip3}
      <button class="btn good stay" class:on={r.stay} disabled={!canDraw && !r.stay} onclick={() => upd(E.toggleStay(r))}>{t('stay')}</button>
    {/if}
    <button class="btn primary next big" style="padding:13px" disabled={!E.canConfirm(r)} onclick={next}>{nextLabel}</button>
  </div>
{/snippet}

<div class="screen" class:tablet={layout.tablet}>
  <div class="top">
    <span class="pill">{t('round', { n: g.history.length + 1 })} · {t('started', { name: name(r.starter) })}</span>
    {#if layout.tablet}<span class="title">Flip 7 Scoreboard</span>{/if}
    <button class="icon-btn" aria-label={t('menu')} onclick={() => setDialog({ t: 'menu' })}>⋯</button>
  </div>
  {#if layout.tablet}
    <div class="split">
      <div class="side"><div class="label">{t('scoreboard')}</div><Scoreboard /></div>
      <div class="main">{@render play()}</div>
    </div>
  {:else}
    <div class="body">{@render play()}</div>
  {/if}
</div>
