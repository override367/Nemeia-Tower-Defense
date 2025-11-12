/* Nemiea TD — game.js merged with pause/volume + new T2/T3 abilities */
(() => {
  // ====== Canvas & HUD ======
  const W=960,H=540;
  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  // Hi‑DPI scaling
  let SCALE_X=1, SCALE_Y=1;
  function fitHiDPI(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const sx = canvas.width  / W;
    const sy = canvas.height / H;
    SCALE_X=sx; SCALE_Y=sy;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  window.addEventListener('resize', fitHiDPI);
  fitHiDPI();

  // Safe getters (index has no #omens/#wave nodes)
  function safeNode(id){ const el=document.getElementById(id); return el || { set textContent(v){}, get textContent(){return '';} }; }
  const $overlay=document.getElementById('overlay');
  const $pauseOverlay=document.getElementById('pauseOverlay');
  const $title=document.getElementById('title');
  const $subtitle=document.getElementById('subtitle');
  const $toast=document.getElementById('toast');
  const $banner=document.getElementById('wavebanner');
  const $build=document.getElementById('buildbar');
  const $omens=safeNode('omens');  // drawn in-canvas, still update for API symmetry
  const $wave=safeNode('wave');
  const $valMaster=document.getElementById('valMaster');
  const $valFx=document.getElementById('valFx');
  const $valMusic=document.getElementById('valMusic');

  // ====== Grid ======
  const ROWS=5, COLS=5;
  const SAND_TOP=Math.floor(H*0.22);
  const GRID_TOP=Math.floor(H*0.22);
  const GRID_LEFT=120, CELL_W=120, CELL_H=72;
  const rowY=r => GRID_TOP + r*CELL_H + CELL_H/2;
  const colX=c => GRID_LEFT + c*CELL_W + CELL_W/2;
  const GRID_LEFT_BOUND = GRID_LEFT - CELL_W*0.9;

  // ====== Difficulty (wave point budgets) ======
  const DIFFS = { easy:0.7, normal:1.0, hard:1.5 };
  let difficulty = 'normal';
  function setDifficulty(d){ difficulty = (d in DIFFS) ? d : 'normal'; }

  // ====== Images (robust, try lowercase too) ======
  const SPR={};
  function loadImageMulti(key,srcs){
    const list = Array.isArray(srcs)? srcs : [srcs];
    let idx=0; const img = new Image();
    function tryNext(){
      if(idx>=list.length){ SPR[key]=null; return; }
      img.onerror = ()=>{ idx++; tryNext(); };
      img.onload  = ()=>{ SPR[key]=img; };
      img.src     = list[idx];
    }
    tryNext();
  }
  const IMG=(name)=>[`images/${name}`,`images/${name[0].toLowerCase()+name.slice(1)}`];

  // Core
  loadImageMulti('sky', IMG('sky.png'));
  loadImageMulti('beach', IMG('sand.png'));
  loadImageMulti('player', IMG('Nemiea.png'));
  loadImageMulti('playerA', IMG('Nemiea_Attack.png'));
  loadImageMulti('draw', IMG('draw.png'));
  loadImageMulti('magicmissile', IMG('magicmissile.png'));
  loadImageMulti('guiding', IMG('guidingbolt.png'));
  loadImageMulti('guidingBoom', IMG('guidingbolt_explosion.png'));
  loadImageMulti('drawBoom', IMG('draw_explosion.png'));
  loadImageMulti('explosionPng', IMG('Explosion.png'));
  loadImageMulti('explosionJpg', IMG('explosion.jpg')); // optional
  loadImageMulti('lane', IMG('lane.png'));
  loadImageMulti('moonbeamTex', IMG('Moonbeam.png'));

  // New spell art
  loadImageMulti('fireball', IMG('fireball.png'));
  loadImageMulti('fireballBoom', IMG('fireballexplosion.png'));
  loadImageMulti('meteor', ['images/meteor.jpg','images/meteor.png']);
  loadImageMulti('lightning', IMG('lightningbolt.png'));
  loadImageMulti('lightBoom', IMG('lightningboltexplosion.png'));

  // Towers: tiered + deaths
  // Mage
  loadImageMulti('blight',   IMG('Mage.png'));
  loadImageMulti('blightA',  IMG('Mage_attack.png'));
  loadImageMulti('blight2',  IMG('Mage2.png'));
  loadImageMulti('blight2A', IMG('Mage2_attack.png'));
  loadImageMulti('blight3',  IMG('Mage3.png'));
  loadImageMulti('blight3A', IMG('Mage3_attack.png'));
  loadImageMulti('blightDead',  IMG('Mage_dead.png'));
  loadImageMulti('blight2Dead', IMG('Mage2_dead.png'));
  loadImageMulti('blight3Dead', IMG('Mage3_dead.png'));
  // Priestess
  loadImageMulti('healing',   IMG('Priestess.png'));
  loadImageMulti('healingA',  IMG('Priestess_attack.png'));
  loadImageMulti('healing2',  IMG('Priestess2.png'));
  loadImageMulti('healing2A', IMG('Priestess2_attack.png'));
  loadImageMulti('healing3',  IMG('Priestess3.png'));
  loadImageMulti('healing3A', IMG('Priestess3_attack.png'));
  loadImageMulti('healingDead',  IMG('Priestess_dead.png'));
  loadImageMulti('healing2Dead', IMG('Priestess2_dead.png'));
  loadImageMulti('healing3Dead', IMG('Priestess3_dead.png'));
  // Knight
  loadImageMulti('agathys',   IMG('Knight.png'));
  loadImageMulti('agathysA',  IMG('Knight_attack.png'));
  loadImageMulti('agathys2',  IMG('Knight2.png'));
  loadImageMulti('agathys2A', IMG('Knight2_attack.png'));
  loadImageMulti('agathys3',  IMG('Knight3.png'));
  loadImageMulti('agathys3A', IMG('Knight3_attack.png'));
  loadImageMulti('agathysDead',  IMG('knight_dead.png'));
  loadImageMulti('agathys2Dead', IMG('knight2_dead.png'));
  loadImageMulti('agathys3Dead', IMG('Knight3_dead.png'));
  // Druid (now with Tier 3)
  loadImageMulti('moonbeamBody',   IMG('Druid.png'));
  loadImageMulti('moonbeamAttack', IMG('Druid_attack.png'));
  loadImageMulti('moonbeamBody2',   IMG('Druid2.png'));
  loadImageMulti('moonbeamAttack2', IMG('Druid2_attack.png'));
  loadImageMulti('moonbeamBody3',   IMG('Druid3.png'));
  loadImageMulti('moonbeamAttack3', IMG('Druid3_attack.png'));
  loadImageMulti('moonbeamDead',  IMG('Druid_dead.png'));
  loadImageMulti('moonbeam2Dead', IMG('druid2_dead.png'));
  loadImageMulti('moonbeam3Dead', IMG('Druid3_dead.png'));

  // Enemies
  loadImageMulti('weak', IMG('granivore.png'));
  loadImageMulti('weak2', IMG('granivore2.png'));
  loadImageMulti('weakAtk', IMG('granivore_attack.png'));
  loadImageMulti('fast', IMG('Spritsplinter.png'));
  loadImageMulti('fast2', IMG('Spritsplinter2.png'));
  loadImageMulti('vex', IMG('vexenmire.png'));
  loadImageMulti('boss', IMG('boss.png'));
  loadImageMulti('boss2', IMG('Boss_2.png'));
  loadImageMulti('bossAtk', IMG('Boss_Attack.png'));

  // ====== Audio (grouped master/FX/music with pause menu) ======
  let VOL={ master:1.0, fx:1.0, music:1.0 };
  function makeAudio(url,{loop=false,vol=0.6}={}){ try{ const a=new Audio(url); a.loop=loop; a.volume=vol; a.preload='auto'; return a; }catch{ return null; } }
  function loadSfx(names,{loop=false,vol=0.7}={}){
    const results=[]; const tryNames = Array.isArray(names)? names : [names];
    const forms = (n)=>[n,n.toLowerCase(),n.toUpperCase(),n.replace(/ /g,''),n.replace(/_/g,'')];
    for(const base of tryNames){ for(const f of forms(base)){ for(const ext of ['wav','mp3','ogg']){ const url=`sounds/${f}.${ext}`; const a=makeAudio(url,{loop,vol}); if(a) results.push(a); } } }
    return results;
  }
  function adjustVol(a){ try{ const base=(a.baseVolume!=null?a.baseVolume:a.volume); const group=(a._group==='music'?'music':'fx'); a.volume=Math.max(0,Math.min(1, base * VOL.master * (group==='music'?VOL.music:VOL.fx))); }catch{} }
  function playOne(list){ if(!list||!list.length) return; for(const a of list){ try{ a.currentTime=0; const p=a.play(); if(p&&p.catch) p.catch(()=>{}); return; }catch{} } }
  const SFX={
    // Core player/towers/enemies
    draw:loadSfx(['draw','drawofomens'],{vol:0.8}),
    guidingbolt:loadSfx('guidingbolt',{vol:0.85}),
    magicmissile:loadSfx('magicmissile',{vol:0.75}),
    moonbeam:loadSfx('moonbeam',{vol:0.8}),
    meleeattack:loadSfx('meleeattack',{vol:0.9}),
    vexpossess:loadSfx(['vexenmirepossess','possess'],{vol:0.9}),
    bossgrowl:loadSfx(['bossgrowl','bossattack','boss'],{vol:0.9}),
    explosion:loadSfx(['explosion','blast'],{vol:0.85}),
    upgrade:loadSfx('upgrade',{vol:0.8}),
    destroy:loadSfx('destroy',{vol:0.8}),
    thunder:loadSfx(['thunder','lightning'],{vol:0.9}),
    fireball:loadSfx(['fireball'],{vol:0.85}),
    fireboom:loadSfx(['fireballexplosion','fireboom'],{vol:0.9}),

    built:{ blight:loadSfx(['magebuilt'],{vol:0.85}), healing:loadSfx(['priestessbuilt'],{vol:0.85}), agathys:loadSfx(['knightbuilt'],{vol:0.85}), moonbeam:loadSfx(['dryadbuilt','druidbuilt'],{vol:0.85}) },
    death:{ blight:loadSfx(['magedeath','magedies'],{vol:0.9}), healing:loadSfx(['priestessdeath','priestessdies'],{vol:0.9}), agathys:loadSfx(['KnightDeath','knightdeath','knightdies'],{vol:0.9}), moonbeam:loadSfx(['dryaddeath','druiddies','druiddeath'],{vol:0.9}) }
  };
  const MUSIC=[makeAudio('sounds/music.mp3',{loop:true,vol:0.25})].filter(Boolean);
  // tag for volume
  (function tagAudio(){
    function walk(o){
      if(!o) return;
      if(Array.isArray(o)){ o.forEach(walk); return; }
      if(typeof o==='object'){
        if(typeof Audio!=='undefined' && o instanceof Audio){
          if(o.baseVolume==null) o.baseVolume=o.volume;
          if(o._group==null) o._group='fx';
          return;
        }
        for(const k in o) walk(o[k]);
      }
    }
    walk(SFX);
    for(const a of MUSIC){ if(a){ if(a.baseVolume==null) a.baseVolume=a.volume; a._group='music'; } }
  })();
  function collectAudio(list,o){
    if(!o) return;
    if(Array.isArray(o)){ o.forEach(x=>collectAudio(list,x)); return; }
    if(typeof o==='object'){
      if(typeof Audio!=='undefined' && o instanceof Audio){ list.push(o); return; }
      for(const k in o) collectAudio(list,o[k]);
    }
  }
  function applyVolumes(){ const list=[]; collectAudio(list,SFX); for(const m of MUSIC) if(m) list.push(m); for(const a of list) adjustVol(a); }
  let volSteps={master:10,fx:10,music:10};
  function setVol(which,val){ volSteps[which]=Math.max(0,Math.min(10,val|0)); VOL.master=volSteps.master/10; VOL.fx=volSteps.fx/10; VOL.music=volSteps.music/10; if($valMaster) $valMaster.textContent=volSteps.master; if($valFx) $valFx.textContent=volSteps.fx; if($valMusic) $valMusic.textContent=volSteps.music; applyVolumes(); }
  setVol('master',10); setVol('fx',10); setVol('music',10);
  document.querySelectorAll('.volbtn').forEach(btn=>{ btn.addEventListener('click',()=>{ const k=btn.getAttribute('data-vol'); const d=parseInt(btn.getAttribute('data-delta'),10)||0; setVol(k, (volSteps[k]||0)+d); }); });

  // ====== State ======
  const player={ x:48, y:rowY(2)-80, w:20, h:96, fireCd:0, fireRate:0.25, omens:3, shootFx:0 };
  $omens.textContent=player.omens;
  let started=false, gameOver=false, victory=false, paused=false, time=0;

  const grid=[...Array(ROWS)].map(()=>Array(COLS).fill(null));
  const towers=[], enemies=[], beams=[], projectiles=[], effects=[];
  const laneMowerReady=Array(ROWS).fill(true);

  // ====== Economy & balance ======
  const COST={ blight:5, healing:3, agathys:6, moonbeam:7, guiding:5 };
  const UPGRADE_COST={ blight:7, healing:6, agathys:9, moonbeam:10 };
  const BLIGHT_COOL = 2.30; // mage constant rate at all tiers
  const HEAL_CD_L1=7.5, HEAL_YIELD_L1=1, HEAL_YIELD_L2=2, HEAL_CD_L2=7.5;
  const AGATHYS_HP_L1=12, AGATHYS_HP_L2=15, AGATHYS_HP_L3=12, AGATHYS_NOVA_DMG_L1=3, AGATHYS_NOVA_DMG_L3=4;
  const AGATHYS_NOVA_R_L1=CELL_H*0.8, AGATHYS_NOVA_R_L3=CELL_H*1.0;
  const MOON_COOL=BLIGHT_COOL, MOON_BEAM_LIFE=0.20, MOON_DMG=1;

  function maxLevelFor(t){ if(t.type==='blight') return 3; if(t.type==='agathys') return 3; if(t.type==='healing') return 3; if(t.type==='moonbeam') return 3; return 1; }
  function upgradeCost(t){ const lvl=t.level||1; const max=maxLevelFor(t); if(lvl>=max) return null; return UPGRADE_COST[t.type] ?? null; }
  function applyLevelStats(t){
    if(t.type==='blight'){ t.cool = BLIGHT_COOL; } // no faster with level
    else if(t.type==='healing'){ if(t.level===1){ t.cool=HEAL_CD_L1; t.yield=HEAL_YIELD_L1; } else { t.cool=HEAL_CD_L2; t.yield=HEAL_YIELD_L2; } }
    else if(t.type==='agathys'){ if(t.level===1){ t.maxhp=AGATHYS_HP_L1; t.novaDmg=AGATHYS_NOVA_DMG_L1; t.novaR=AGATHYS_NOVA_R_L1; } if(t.level===2){ t.maxhp=AGATHYS_HP_L2; } if(t.level===3){ t.maxhp=AGATHYS_HP_L3; t.novaDmg=AGATHYS_NOVA_DMG_L3; t.novaR=AGATHYS_NOVA_R_L3; } t.hp=Math.min(t.maxhp, t.hp??t.maxhp); }
    else if(t.type==='moonbeam'){ t.cool = MOON_COOL; if(t.level>=3 && t.lightCd==null) t.lightCd = t.cool/2; } // L3 has in-between lightning
  }

  // Penumbra discount
  let penCnt=0, penReady=false, penFx=0;
  const penDiscount = () => (penReady? 3 : 0);

  // Modes & input
  let buildMode=null, hoverCell=null, upgradeMode=false, refundMode=false;
  let mouseDown=false;
  canvas.addEventListener('mousedown',()=>{ mouseDown=true; });
  window.addEventListener('mouseup',()=>{ mouseDown=false; });
  canvas.addEventListener('mouseleave',()=>{ mouseDown=false; });

  // ====== Start & input ======
  function startGame(){ if(started) return; started=true; $overlay.style.display='none'; if(MUSIC[0]){ try{ MUSIC[0].currentTime=0; MUSIC[0].play(); }catch{} } scheduleWave(1); }
  function chooseDifficultyStart(d){ setDifficulty(d); startGame(); }
  document.querySelectorAll('.diff').forEach(btn=>{ btn.addEventListener('click',()=>chooseDifficultyStart(btn.getAttribute('data-diff'))); });

  window.addEventListener('keydown',e=>{
    if(e.key==='p'||e.key==='P'){ paused=!paused; if($pauseOverlay) $pauseOverlay.style.display = paused ? 'grid' : 'none'; return; }
    if(e.code==='Space' || e.key==='Enter'){ setDifficulty('normal'); startGame(); }
    if(e.key==='r'||e.key==='R') location.reload();

    if(e.key==='1'){ buildMode='healing'; $build.hidden=true; toast('Placing priestess — click a cell'); }
    if(e.key==='2'){ buildMode='blight';  $build.hidden=true; toast('Placing mage — click a cell'); }
    if(e.key==='3'){ buildMode='agathys'; $build.hidden=true; toast('Placing knight — click a cell'); }
    if(e.key==='4'){ buildMode='moonbeam';$build.hidden=true; toast('Placing druid — click a cell'); }
    if(e.key==='5'){ e.preventDefault(); if(!started){ setDifficulty('normal'); startGame(); } if(buildMode==='guiding'){ fireGuiding(mouse.x, mouse.y); } else { buildMode='guiding'; toast('Guiding Bolt armed — click to fire (5)'); } }
    if(e.key==='6'){ upgradeMode=!upgradeMode; refundMode=false; document.body.setAttribute('data-mode', upgradeMode?'upgrade':''); if(!upgradeMode) document.body.removeAttribute('data-mode'); }
    if(e.key==='7'){ refundMode=!refundMode; upgradeMode=false; document.body.setAttribute('data-mode', refundMode?'refund':''); if(!refundMode) document.body.removeAttribute('data-mode'); }

    if(e.key==='b'||e.key==='B'){ buildMode=null; upgradeMode=false; refundMode=false; document.body.removeAttribute('data-mode'); $build.hidden=!$build.hidden; }
    if(e.key==='Escape'){ buildMode=null; upgradeMode=false; refundMode=false; document.body.removeAttribute('data-mode'); $build.hidden=true; }
    if(e.key==='u'||e.key==='U'){ upgradeMode=!upgradeMode; refundMode=false; document.body.setAttribute('data-mode', upgradeMode?'upgrade':''); if(!upgradeMode) document.body.removeAttribute('data-mode'); }
    if(e.key==='d'||e.key==='D'){ refundMode=!refundMode; upgradeMode=false; document.body.setAttribute('data-mode', refundMode?'refund':''); if(!refundMode) document.body.removeAttribute('data-mode'); }
    if(e.key==='g'||e.key==='G'){ e.preventDefault(); if(!started) { setDifficulty('normal'); startGame(); } if(buildMode==='guiding'){ fireGuiding(mouse.x, mouse.y); } else { buildMode='guiding'; toast('Guiding Bolt armed — click to fire (5)'); } }
  });
  $overlay.addEventListener('click', () => { setDifficulty('normal'); startGame(); });

  canvas.addEventListener('contextmenu', e=>{ e.preventDefault(); if(buildMode){ buildMode=null; toast('Build cancelled'); } else if(upgradeMode||refundMode){ upgradeMode=false; refundMode=false; document.body.removeAttribute('data-mode'); toast('Action cancelled'); } });

  // Build bar (tiles + upgrade/refund tiles)
  $build.addEventListener('click', (e) => {
    const el = e.target.closest('[data-t], #tileUpgrade, #tileRefund');
    if (!el) return;
    const t = el.getAttribute('data-t');
    if (t) {
      buildMode = t; $build.hidden = true;
      toast(t === 'guiding' ? 'Guiding Bolt armed — click to fire (5)' : `Placing ${t} — click a cell`);
      return;
    }
    if (el.id === 'tileUpgrade') { upgradeMode = !upgradeMode; refundMode = false; document.body.setAttribute('data-mode', upgradeMode ? 'upgrade' : ''); if(!upgradeMode) document.body.removeAttribute('data-mode'); }
    if (el.id === 'tileRefund')  { refundMode  = !refundMode; upgradeMode=false; document.body.setAttribute('data-mode', refundMode  ? 'refund'  : '');  if(!refundMode)  document.body.removeAttribute('data-mode'); }
  });

  // Mouse & hover
  const mouse={x:W/2,y:H/2};
  function getEnemyAt(mx,my){
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i]; if(!e||e.hp<=0) continue;
      if(mx>=e.x && mx<=e.x+e.w && my>=e.y && my<=e.y+e.h) return e;
    }
    return null;
  }
  canvas.addEventListener('mousemove',e=>{ const r=canvas.getBoundingClientRect(), sx=W/r.width, sy=H/r.height; mouse.x=(e.clientX-r.left)*sx; mouse.y=(e.clientY-r.top)*sy; hoverCell = toCell(mouse.x,mouse.y); });
  canvas.addEventListener('click',()=>{
    if(!started||gameOver||victory) return;
    if(buildMode){
      if(buildMode==='guiding'){ if (fireGuiding(mouse.x, mouse.y)) { buildMode=null; } return; }
      if(!hoverCell){ toast('Click inside the grid'); return; }
      if(placeTower(buildMode, hoverCell.row, hoverCell.col)){ buildMode=null; }
      return;
    }
    if(upgradeMode || refundMode){
      if(hoverCell && grid[hoverCell.row][hoverCell.col]){
        const t=grid[hoverCell.row][hoverCell.col];
        if(upgradeMode) tryUpgrade(t); else tryDelete(t);
        upgradeMode=false; refundMode=false; document.body.removeAttribute('data-mode');
      }
      return;
    }
    if(player.fireCd<=0){ firePlayerShot(); }
  });

  function firePlayerShot(){
    const target = getEnemyAt(mouse.x, mouse.y);
    const spd=520, dmg=1;
    if(target){
      projectiles.push({ x:player.x+player.w/2, y:player.y+player.h/2, speed:spd, targetId:target.id, targeted:true, src:'player', dmg, r:7 });
    }else{
      const ang=Math.atan2(mouse.y-(player.y+player.h/2), mouse.x-(player.x+player.w/2));
      projectiles.push({ x:player.x+player.w/2, y:player.y+player.h/2, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, src:'player', dmg, r:6 });
    }
    player.fireCd=player.fireRate; player.shootFx=0.18; playOne(SFX.draw);
  }
  function fireGuiding(tx, ty){
    const price=costForBuild('guiding');
    if(player.omens<price){ toast('Not enough Omens'); return false; }
    player.omens-=price; $omens.textContent=player.omens;
    if(penReady){ penReady=false; penFx=0; toast('Penumbra spent (–3)'); }
    const cx=player.x+player.w/2, cy=player.y+player.h/2;
    const ang=Math.atan2(ty-cy, tx-cx); const spd=900;
    projectiles.push({ x:cx, y:cy, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, kind:'guiding', pool:10, r:8 });
    playOne(SFX.guidingbolt); toast('Guiding Bolt fired');
    return true;
  }

  function toast(msg,ms=1500){ $toast.textContent=msg; $toast.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>{$toast.hidden=true},ms); }
  function banner(msg,ms=1600){ if(!$banner) return; $banner.textContent=msg; $banner.hidden=false; clearTimeout(banner._t); banner._t=setTimeout(()=>{$banner.hidden=true},ms); }
  function toCell(mx,my){ if(mx<GRID_LEFT || mx>GRID_LEFT+COLS*CELL_W || my<GRID_TOP || my>GRID_TOP+ROWS*CELL_H) return null; return { row:Math.floor((my-GRID_TOP)/CELL_H), col:Math.floor((mx-GRID_LEFT)/CELL_W) }; }
  function costForBuild(type){ return Math.max(0, (COST[type]||999) - penDiscount()); }

  // ====== Build, upgrade, refund ======
  function placeTower(type,row,col){
    if(grid[row][col]){ const old=grid[row][col]; const refund=refundFor(old); grid[row][col]=null; const i=towers.indexOf(old); if(i!==-1) towers.splice(i,1); player.omens+=refund; $omens.textContent=player.omens; playOne(SFX.destroy); spawnExplosion(old.x,old.y,'draw'); toast(`Replaced ${old.type} (+${refund})`); }
    const price=costForBuild(type); if(player.omens<price){ toast('Not enough Omens'); return false; }
    player.omens-=price; $omens.textContent=player.omens; if(penReady){ penReady=false; penFx=0; toast('Penumbra spent (–3)'); }
    const t={ type,row,col,x:colX(col),y:rowY(row),level:1,hp:4,maxhp:4,cd:0,next:0,w:36,h:36,spent:price,genCount:0, attackFx:0, atkCd:0, dead:false, possessed:false, possessedBy:null, blink:0, drawOffX:0, lightCd:null };
    if(type==='blight'){ t.cool=BLIGHT_COOL; }
    if(type==='healing'){ t.cool=HEAL_CD_L1; t.yield=HEAL_YIELD_L1; }
    if(type==='agathys'){ t.maxhp=AGATHYS_HP_L1; t.hp=t.maxhp; t.novaDmg=AGATHYS_NOVA_DMG_L1; t.novaR=AGATHYS_NOVA_R_L1; }
    if(type==='moonbeam'){ t.cool=MOON_COOL; }
    towers.push(t); grid[row][col]=t; playOne(SFX.built[type]); return true;
  }
  function tryUpgrade(t){
    const cost=upgradeCost(t); if(cost==null){ toast('Already max level'); return; }
    if(player.omens<cost){ toast('Not enough Omens'); return; }
    player.omens-=cost; $omens.textContent=player.omens; t.spent=(t.spent||0)+cost;
    t.level=Math.min(maxLevelFor(t),(t.level||1)+1); applyLevelStats(t);
    t.hp=Math.min(t.maxhp,(t.hp||t.maxhp)+Math.ceil(t.maxhp*0.25));
    playOne(SFX.upgrade); toast(`${t.type} upgraded to L${t.level}`);
  }
  function refundFor(t){ const spent=(typeof t.spent==='number')? t.spent : ((COST[t.type]||0) + (UPGRADE_COST[t.type]||0)*Math.max(0,(t.level||1)-1)); return Math.ceil(spent/2); }
  function tryDelete(t){ const refund=refundFor(t); grid[t.row][t.col]=null; const i=towers.indexOf(t); if(i!==-1) towers.splice(i,1); player.omens+=refund; $omens.textContent=player.omens; playOne(SFX.destroy); spawnExplosion(t.x,t.y,'draw'); toast(`Deleted ${t.type} (+${refund})`); }

  // ====== Spawning (randomized budgets, boss dual-lane) ======
  const ENEMY_SPEED_MUL=0.9;
  const ENEMY_COST = { weak:2, mid:3, fast:3, vex:5, boss:20 };
  const BOSS_WAVES = new Set([5,8,10]);
  const WAVE_BUDGETS = { 1:16, 2:22, 3:30, 4:38, 5:48, 6:56, 7:68, 8:84, 9:96 };
  const spawnRateFor = (w) => Math.max(0.3, 2.0 - 0.12*w);

  let wave=1; $wave.textContent=wave; let spawnPlan=null, spawnTimer=0, interWave=0, nextWave=null;

  function buildWaveQueue(w){
    if(w===10){ return Array(5).fill('boss'); }
    let budget = WAVE_BUDGETS[w] ?? (14 + w*8);
    budget = Math.max(4, Math.floor(budget * (DIFFS[difficulty] || 1)));
    const queue=[]; const pool=[];
    if(w>=1) pool.push('weak');
    if(w>=3) pool.push('mid');
    if(w>=4) pool.push('fast');
    if(w>=5) pool.push('vex');
    if(BOSS_WAVES.has(w)){ queue.push('boss'); budget -= ENEMY_COST.boss; }
    let guard=200;
    while(budget>0 && queue.length<60 && guard-->0){
      const options = pool.filter(t => ENEMY_COST[t] <= budget);
      if(!options.length) break;
      const pick = options[Math.floor(Math.random()*options.length)];
      queue.push(pick);
      budget -= ENEMY_COST[pick];
    }
    return queue;
  }
  function scheduleWave(w){
    wave=w; $wave.textContent=w; banner(`Wave ${w} — ${difficulty[0].toUpperCase()+difficulty.slice(1)}`);
    const queue = buildWaveQueue(w); spawnPlan = { queue, idx:0, rate: spawnRateFor(w) }; spawnTimer = 0.5 + Math.random()*0.5;
  }
  function spawnEnemy(kind){
    let row=Math.floor(Math.random()*ROWS);
    const eId=Math.random().toString(36).slice(2);
    const base={ id:eId,row,x:W+40,y:0,w:42,h:42,hp:6,vx:-70,type:kind,tagTimer:0,lastHitBy:null,blinkCd:0,anim:0,state:'walk',attackCd:0 };
    if(kind==='weak'){ base.hp=8; base.vx=-55; base.y=rowY(row)-21; }
    if(kind==='mid'){ base.hp=12; base.vx=-50; base.y=rowY(row)-21; }
    if(kind==='fast'){ base.hp=6; base.vx=-130; base.y=rowY(row)-21; base.hopCd=0; }
    if(kind==='vex'){ base.hp=11; base.vx=-45; base.y=rowY(row)-21; base.spdSteps=0; } // 11 HP and speeds up as damaged
    if(kind==='boss'){
      base.hp=70; base.w=90; base.h=90; base.vx=-28*1.2; // +20% faster
      const rowB = (row<ROWS-1)? row+1 : row-1; base.row=row; base.rowB=rowB;
      const centerY = (rowY(row)+rowY(rowB))/2; base.y = centerY - base.h/2;
    }
    base.vx*=ENEMY_SPEED_MUL; base.baseVx = base.vx; enemies.push(base);
  }
  function updateSpawning(dt){
    if(!started||gameOver||victory||!spawnPlan || paused) return;
    spawnTimer-=dt;
    if(spawnTimer<=0 && spawnPlan.idx < spawnPlan.queue.length){
      const k = spawnPlan.queue[spawnPlan.idx++]; spawnEnemy(k); spawnTimer=spawnPlan.rate;
    }
    if(spawnPlan.idx>=spawnPlan.queue.length && enemies.every(e=>!e || e.hp<=0)){
      if(wave<10){ nextWave=wave+1; interWave=4.0; spawnPlan=null; } else { victory=true; showOverlay('You defended the beach!','Press R to restart'); }
    }
  }

  // ====== Loop ======
  let last=performance.now(); requestAnimationFrame(loop);
  function loop(ts){ const dt=Math.min(1/30,(ts-last)/1000); last=ts; if(started && !gameOver && !victory && !paused) update(dt); draw(dt); requestAnimationFrame(loop); }
  function onEnemyDamaged(e, src){
    if(e.type==='vex'){
      if(typeof e.spdSteps!=='number') e.spdSteps=0;
      if(e.spdSteps<3){ e.spdSteps++; const mul = 1 + 0.3*e.spdSteps; e.vx = e.baseVx * mul; }
    }
    if(e.type==='fast' && (e.hopCd||0)<=0){
      const choices=[0,1,2,3,4].filter(r=>r!==e.row);
      const nr = choices[(Math.random()*choices.length)|0];
      e.row=nr; e.y=rowY(nr)-21; e.hopCd=1.0;
    }
  }

  // ====== Helpers for new spells ======
  function nearestEnemyInFront(row, xMin){
    const cand = enemies.filter(e=>e && e.hp>0 && (e.row===row || e.rowB===row) && e.x >= xMin)
                        .sort((a,b)=> a.x-b.x);
    return cand[0] || null;
  }
  function splashSameRow(row, cx, range, dmg){
    for(const e of enemies){ if(!e||e.hp<=0) continue; if(e.row===row || e.rowB===row){ const ex=e.x+e.w/2; if(Math.abs(ex-cx)<=range){ e.hp-=dmg; e.lastHitBy='spell'; onEnemyDamaged(e,'spell'); } } }
  }
  function splashRows(rows, cx, range, dmg){
    for(const e of enemies){ if(!e||e.hp<=0) continue; if(rows.includes(e.row) || (e.rowB!=null && rows.includes(e.rowB))){ const ex=e.x+e.w/2; if(Math.abs(ex-cx)<=range){ e.hp-=dmg; e.lastHitBy='spell'; onEnemyDamaged(e,'spell'); } } }
  }
  function castMeteor(t, target){
    // Spawn meteor projectile from off-screen top-left toward target's current center; persist even if target dies
    const tx = target.x + target.w/2, ty = target.y + target.h/2;
    const sx = t.x - 220, sy = -120; const travel=0.8;
    const vx = (tx - sx) / travel; const vy = (ty - sy) / travel;
    const rows=[];
    if(target.row!=null) rows.push(target.row);
    if(target.rowB!=null) rows.push(target.rowB);
    projectiles.push({ kind:'meteor', x:sx, y:sy, vx, vy, ttl:travel, t:0, r:18, dmgP:4, dmgAOE:2, cx:tx, cy:ty, targetId:target.id, targetRows:rows });
    playOne(SFX.explosion); // whoosh not provided; reuse
  }
  function castFireball(t){
    // Faster than missile? keep same speed, different hit behavior
    projectiles.push({ kind:'fireball', x:t.x, y:t.y-8, vx:+360, vy:0, r:10, dmgP:2, dmgAOE:1, row:t.row });
    playOne(SFX.fireball);
  }
  function castLightning(t){
    const target = nearestEnemyInFront(t.row, t.x + 10);
    if(!target) return false;
    const cx = target.x + target.w/2, cy = target.y;
    // Damage: 2 to primary lane near impact; 1 to left/right neighbors on same row, and to lanes up/down at same x
    splashSameRow(t.row, cx, 30, 2);
    splashSameRow(t.row, cx-90, 20, 1); // left fork
    splashSameRow(t.row, cx+90, 20, 1); // right fork
    splashRows([Math.max(0,t.row-1), Math.min(ROWS-1,t.row+1)], cx, 26, 1);
    // Visual: bolt from top
    effects.push({type:'lbolt', x:cx, y0:-20, y1:cy, t:0, life:0.18});
    spawnExplosion(cx, cy, 'lightning');
    playOne(SFX.thunder);
    return true;
  }

  // ====== Update ======
  function update(dt){
    time += dt;
    player.fireCd=Math.max(0,player.fireCd-dt);
    player.shootFx=Math.max(0,player.shootFx-dt);
    if(penFx>0) penFx=Math.max(0,penFx-dt);

    // Hold-to-fire when not in any mode
    if(started && !gameOver && !victory && !buildMode && !upgradeMode && !refundMode && mouseDown && player.fireCd<=0){
      firePlayerShot();
    }

    updateSpawning(dt);
    if(interWave>0){ interWave-=dt; if(interWave<=0 && nextWave){ scheduleWave(nextWave); nextWave=null; } }

    for(const e of enemies){ if(e) e.hopCd=Math.max(0,(e.hopCd||0)-dt); }

    // Towers
    for(const t of towers){
      t.cd=Math.max(0,(t.cd||0)-dt);
      t.attackFx=Math.max(0,(t.attackFx||0)-dt);
      if(t.dead) continue;

      if(t.possessed){
        // Possessed behavior: lane-limited reflected damage
        if(t.cd<=0){
          const leftAllies = towers.filter(x=>x && !x.dead && !x.possessed && x.row===t.row && x.x<t.x).sort((a,b)=>b.x-a.x);
          if(t.type==='blight'){
            const trg = leftAllies[0]; if(trg){ trg.hp -= 1; if(trg.hp<=0) killTower(trg); playOne(SFX.magicmissile); }
            t.cd = BLIGHT_COOL;
          }else if(t.type==='moonbeam'){
            for(const trg of leftAllies.slice(0,3)){ trg.hp -= MOON_DMG; if(trg.hp<=0) killTower(trg); }
            playOne(SFX.moonbeam); t.cd = MOON_COOL;
          }else if(t.type==='agathys'){
            const near = leftAllies.find(x=>Math.abs(x.x - t.x) < (t.w||36)*0.6);
            if(near){ near.hp -= 1; if(near.hp<=0) killTower(near); playOne(SFX.meleeattack); }
            t.cd = 0.9;
          }else if(t.type==='healing'){
            const trg = leftAllies[0]; if(trg){ trg.hp -= 1; if(trg.hp<=0) killTower(trg); playOne(SFX.meleeattack); }
            t.cd = HEAL_CD_L1;
          }
          t.attackFx=0.18;
        }
        continue;
      }

      // Friendly behavior
      if(t.type==='blight'){
        if(t.cd<=0){
          if((t.level||1) >= 3){
            // Meteor: only cast if a target exists; keep same base rate
            const tgt = nearestEnemyInFront(t.row, t.x+10);
            if(tgt){ castMeteor(t, tgt); t.cd = t.cool; t.attackFx=0.18; }
            else { t.cd = 0.2; } // short wait & retry
          } else if((t.level||1) === 2){
            castFireball(t); t.cd = t.cool; t.attackFx=0.18;
          } else {
            projectiles.push({ x:t.x, y:t.y-8, vx:+380, vy:0, src:'mage', dmg:1, r:7 });
            playOne(SFX.magicmissile); t.cd=t.cool; t.attackFx=0.18;
          }
        }
      } else if(t.type==='healing'){
        if(t.cd<=0){
          player.omens += (t.yield||1); $omens.textContent=player.omens;
          t.genCount=(t.genCount||0)+1;
          // L2+ heal only own lane
          if((t.level||1)>=2 && t.genCount % 2 === 0){
            let damaged=towers.filter(x=>x.row===t.row && !x.dead && x.hp<x.maxhp);
            if(damaged.length){
              damaged.sort((a,b)=> (b.maxhp-b.hp)-(a.maxhp-a.hp));
              let trg=damaged[0]; const heal=(t.level>=3 ? 6 : 3);
              trg.hp=Math.min(trg.maxhp, trg.hp+heal); effects.push({type:'heal', x:trg.x, y:trg.y-28, t:0, life:0.8});
            }
          }
          // L3 priestess: resurrection attempt each pulse
          if((t.level||1)>=3){
            const corpse = towers.find(x=>x && x.dead);
            if(corpse){
              const resCost = Math.ceil((corpse.spent||COST[corpse.type]||0) * 0.5);
              if(player.omens >= resCost){
                player.omens -= resCost; $omens.textContent=player.omens;
                corpse.dead=false; corpse.hp=Math.ceil(corpse.maxhp*0.5); corpse.possessed=false; corpse.possessedBy=null;
                toast(`Priestess resurrects ${corpse.type} (–${resCost})`);
              }
            }
          }
          t.attackFx=0.18; t.cd=t.cool;
        }
      } else if(t.type==='agathys'){
        t.atkCd = Math.max(0,(t.atkCd||0)-dt);
        const canMelee = (t.level||1) >= 1;
        const atkRate = (t.level>=2 ? 0.75 : 1.5);
        if(canMelee && t.atkCd<=0){
          const near = enemies
            .filter(e=>e && e.hp>0 && (e.row===t.row || e.rowB===t.row) && e.x <= t.x + (t.w||36)*0.3)
            .sort((a,b)=> a.x - b.x)[0];
          if(near){
            const dmg = (t.level>=3 ? 3 : (t.level>=2 ? 2 : 1));
            near.hp -= dmg; near.lastHitBy='knight'; onEnemyDamaged(near,'knight');
            t.atkCd = atkRate; t.attackFx = 0.18; playOne(SFX.meleeattack);
            // L3 lunge (visual offset)
            if(t.level>=3){
              t.lungeT=0.18; t.lungeDir = (near.x + near.w/2 >= t.x ? +1 : -1);
            }
          }
        }
        if(t.lungeT){ t.lungeT = Math.max(0, t.lungeT-dt); const k = 1 - (t.lungeT/0.18); const amp=36; const phase = k<0.5? (k/0.5) : (1-(k-0.5)/0.5); t.drawOffX = amp*phase*(t.lungeDir||1); if(t.lungeT<=0) t.drawOffX=0; }
      } else if(t.type==='moonbeam'){
        if(t.cd<=0){
          // Beam
          const life = (t.level>=2) ? (MOON_BEAM_LIFE*2) : MOON_BEAM_LIFE;
          const thick = (t.level>=2) ? 30 : 24;
          beams.push({ row:t.row, t:0, life, cx:t.x-16, dy:-8, thick });
          // Damage max 3 targets per fire
          const targets = enemies.filter(e=>e && e.hp>0 && (e.row===t.row || e.rowB===t.row)).sort((a,b)=> (a.x - t.x) - (b.x - t.x)).slice(0,3);
          for(const e of targets){ e.hp -= MOON_DMG; e.lastHitBy='moon'; onEnemyDamaged(e,'moon'); }
          playOne(SFX.moonbeam);
          t.cd = t.cool;
          t.attackFx=0.18;
          if((t.level||1)>=3){ t.lightCd = t.cool/2; } // reset lightning window
        } else if((t.level||1)>=3){
          t.lightCd = Math.max(0,(t.lightCd||0)-dt);
          if(t.lightCd<=0){ if(castLightning(t)){ t.lightCd = t.cool; } else { t.lightCd = 0.2; } }
        }
      }
    }

    // Projectiles
    for(const p of projectiles){
      if(p.targeted){
        const trg = enemies.find(e=>e && e.id===p.targetId && e.hp>0);
        if(!trg){ p.dead=true; continue; }
        const tx = trg.x + trg.w/2, ty = trg.y + trg.h/2;
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx,dy) || 1;
        const v = p.speed || 520; p.vx = dx/d * v; p.vy = dy/d * v;
      }
      p.x += (p.vx||0)*dt; p.y += (p.vy||0)*dt;
      if(p.kind==='meteor'){
        if(p.targetId){
          const follow = enemies.find(e=>e && e.id===p.targetId && e.hp>0);
          if(follow){
            p.cx = follow.x + follow.w/2;
            p.cy = follow.y + follow.h/2;
            const rows=[];
            if(follow.row!=null) rows.push(follow.row);
            if(follow.rowB!=null) rows.push(follow.rowB);
            if(rows.length) p.targetRows = rows;
          }
        }
        p.t += dt;
        if(p.t >= p.ttl){ // impact
          const primaryRow = (p.targetRows && p.targetRows.length) ? p.targetRows[0] : nearestRowFromY(p.cy);
          const adjCandidates = (p.targetRows && p.targetRows.length>1) ? p.targetRows.slice(1) : [primaryRow-1, primaryRow+1];
          const adjRows = adjCandidates.filter(r=>r>=0 && r<ROWS && r!==primaryRow);
          splashSameRow(primaryRow, p.cx, 28, p.dmgP);
          if(adjRows.length) splashRows(adjRows, p.cx, 36, p.dmgAOE);
          splashSameRow(primaryRow, p.cx-100, 26, p.dmgAOE);
          splashSameRow(primaryRow, p.cx+100, 26, p.dmgAOE);
          spawnExplosion(p.cx, p.cy, 'meteor'); p.dead=true; continue;
        }
      }
      if(p.kind!=='meteor'){
        for(const e of enemies){
          if(!e || e.hp<=0) continue;
          if(p.targeted && e.id!==p.targetId) continue;
          if(Math.abs((e.y+e.h/2)-p.y) > CELL_H*0.5) continue;
          if(Math.abs((e.x+e.w/2)-p.x) <= Math.max(p.r||6, e.w*0.5)){
            if(p.kind==='guiding'){
              const deal=Math.min(p.pool, e.hp); e.hp-=deal; onEnemyDamaged(e,'player'); p.pool-=deal; e.lastHitBy='player';
              spawnExplosion(p.x, p.y,'guiding'); if(p.pool<=0){ p.dead=true; break; }
            } else if(p.kind==='fireball'){
              e.hp -= p.dmgP; e.lastHitBy='spell'; onEnemyDamaged(e,'spell');
              splashSameRow(p.row, e.x+e.w/2, 80, p.dmgAOE);
              spawnExplosion(p.x, p.y,'fireball'); playOne(SFX.fireboom);
              p.dead=true; break;
            } else {
              e.hp -= (p.dmg||1); e.lastHitBy = p.src==='player' ? 'player' : 'tower'; onEnemyDamaged(e, e.lastHitBy);
              spawnExplosion(p.x, p.y, p.src==='player' ? 'drawHit' : 'draw'); p.dead=true; break;
            }
          }
        }
      }
      if(p.x>W+60||p.x<-60||p.y<-60||p.y>H+60) p.dead=true;
    }
    for(let i=projectiles.length-1;i>=0;i--) if(projectiles[i].dead) projectiles.splice(i,1);

    // Beams life
    for(let i=beams.length-1;i>=0;i--){ beams[i].t+=dt; if(beams[i].t>beams[i].life) beams.splice(i,1); }

    // Enemies update/collision
    for(const e of enemies){
      if(!e || e.hp<=0) continue;
      e.blinkCd=Math.max(0,(e.blinkCd||0)-dt);
      e.attackCd=Math.max(0,(e.attackCd||0)-dt);
      e.anim=(e.anim||0)+dt;

      // blockers: skip dead/possessed
      const blockers = towers.filter(t=>t && !t.dead && !t.possessed && (e.row===t.row || (e.rowB!=null && e.rowB===t.row))).sort((a,b)=>a.x-b.x);
      let blocking=null; for(const t of blockers){ if(e.x <= t.x + (t.w||36)*0.3){ blocking=t; break; } }

      if(blocking){
        if(e.type==='vex'){
          if(!blocking.possessed){
            blocking.possessed=true; blocking.possessedBy=e.id; playOne(SFX.vexpossess);
          }
          e.state='possess'; e.vx=0;
        } else {
          e.state='attack';
          const chewBase = (e.type==='boss'? 28 : 12) * dt/10;
          if(e.type==='boss'){
            if(e.attackCd<=0){ playOne(SFX.bossgrowl); e.attackCd=0.55; }
            blocking.hp -= chewBase;
            const otherRow = (e.rowB!=null && blocking.row===e.row) ? e.rowB : e.row;
            const otherBlock = towers.find(t=>t && !t.dead && !t.possessed && t.row===otherRow && e.x <= t.x + (t.w||36)*0.3);
            if(otherBlock) otherBlock.hp -= chewBase;
            if(blocking.hp<=0) killTower(blocking);
            if(otherBlock && otherBlock.hp<=0) killTower(otherBlock);
          } else {
            if(e.attackCd<=0){ playOne(SFX.meleeattack); e.attackCd=0.55; }
            blocking.hp -= chewBase;
            if(blocking.hp<=0) killTower(blocking);
          }
        }
      } else { e.state='walk'; e.x += e.vx*dt; }

      // Left edge / mower
      const rowsHit = (e.rowB!=null)? [e.row,e.rowB] : [e.row];
      if(e.x <= GRID_LEFT_BOUND){
        let cleared=false;
        for(const r of rowsHit){
          if(laneMowerReady[r]){ laneMowerReady[r]=false; for(const x of enemies){ if(x && (x.row===r || x.rowB===r)) x.hp=0; } cleared=true; }
        }
        if(cleared){ playOne(SFX.explosion); toast('Lane surge clears the row!'); }
        else { gameOver=true; showOverlay('Overrun!','Press R to restart'); }
      }
    }

    // Deaths & Penumbra
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(!e || e.hp>0) continue;
      if(e.lastHitBy==='player' || e.tagTimer>0){ penCnt++; if(penCnt>=3){ penCnt=0; penReady=true; penFx=2.2; toast('Penumbra ready! (–3 next build)'); } }
      if(e.type==='vex'){ for(const t of towers){ if(t && t.possessedBy===e.id){ t.possessed=false; t.possessedBy=null; } } }
      spawnExplosion(e.x+e.w/2, e.y+e.h/2, 'draw'); playOne(SFX.explosion); enemies.splice(i,1);
    }
  }

  function nearestRowFromY(y){ // helper for meteor
    let minD=1e9, best=0; for(let r=0;r<ROWS;r++){ const d=Math.abs(y - rowY(r)); if(d<minD){ minD=d; best=r; } } return best;
  }

  // ====== Draw ======
  function line(x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  function drawSprite(img,x,y,w,h,fb='#fff'){ if(img) ctx.drawImage(img,x,y,w,h); else { ctx.fillStyle=fb; ctx.fillRect(x,y,w,h); ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.strokeRect(x,y,w,h); } }
  function drawCenterByHeight(img,cx,cy,targetH,fb='#fff',flipX=false,dx=0){
    const X = cx + (dx||0);
    if(img&&img.width){
      const ar=img.width/(img.height||1); const w=targetH*ar;
      if(!flipX){ ctx.drawImage(img,X-w/2,cy-targetH/2,w,targetH); }
      else { ctx.save(); ctx.translate(X, cy); ctx.scale(-1,1); ctx.drawImage(img,-w/2,-targetH/2,w,targetH); ctx.restore(); }
    } else { ctx.fillStyle=fb; ctx.fillRect(X-targetH/2,cy-targetH/2,targetH,targetH); }
  }
  function spawnExplosion(x,y,kind='draw'){
    const life = 0.55;
    const map = {guiding:'gboom', draw:'dboom', fireball:'fboom', lightning:'lboom', meteor:'mboom', drawHit:'dboomhit'};
    effects.push({type:map[kind]||'dboom', x, y, t:0, life});
  }
  function killTower(t){
    t.dead=true; t.possessed=false; t.possessedBy=null; t.hp=0;
    playOne(SFX.death[t.type]||[]);
    spawnExplosion(t.x,t.y,'draw');
    if(t.type==='agathys'){
      for(const f of enemies){
        if(!f || f.hp<=0 || !(f.row===t.row || f.rowB===t.row)) continue;
        if(f.x >= t.x-10){
          const dx=(f.x+f.w/2)-t.x, dy=(f.y+f.h/2)-t.y;
          const R=t.novaR||AGATHYS_NOVA_R_L1, D=t.novaDmg||AGATHYS_NOVA_DMG_L1;
          if(Math.hypot(dx,dy)<=R){ f.hp -= D; f.lastHitBy='agathys'; }
        }
      }
    }
  }
  function showOverlay(t,sub){ if($title) $title.textContent=t; if($subtitle) $subtitle.innerHTML=sub||''; if($overlay) $overlay.style.display='grid'; }

  function deadKeyFor(t){
    const L=Math.min(3,t.level||1);
    if(t.type==='blight') return ['blightDead','blight2Dead','blight3Dead'][L-1];
    if(t.type==='healing')return ['healingDead','healing2Dead','healing3Dead'][L-1];
    if(t.type==='agathys')return ['agathysDead','agathys2Dead','agathys3Dead'][L-1];
    if(t.type==='moonbeam')return ['moonbeamDead','moonbeam2Dead','moonbeam3Dead'][L-1];
    return null;
  }

  function draw(){
    // Background
    if(SPR.sky) ctx.drawImage(SPR.sky,0,0,W,H); else { const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#6ec6ff'); g.addColorStop(1,'#bfe6ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
    if(SPR.beach){
      const TEX_SCALE = .5;
      const pattern = ctx.createPattern(SPR.beach, 'repeat');
      if(pattern && pattern.setTransform){ pattern.setTransform(new DOMMatrix().scale(TEX_SCALE / SCALE_X, TEX_SCALE / SCALE_Y)); }
      ctx.save(); ctx.fillStyle = pattern; ctx.fillRect(0, SAND_TOP, W, H - SAND_TOP); ctx.restore();
    } else { ctx.fillStyle='#e8d29b'; ctx.fillRect(0,SAND_TOP,W,H-SAND_TOP); }

    // Lanes
    const LANE_H = Math.floor(CELL_H*0.5);
    if(SPR.lane && SPR.lane.width){
      for(let r=0;r<ROWS;r++){ const y = rowY(r) - LANE_H/2 +35; const iw = SPR.lane.width; for(let x=0; x<W; x+=iw){ ctx.drawImage(SPR.lane, x, y, iw, LANE_H); } }
    }

    // Grid
    ctx.save(); ctx.globalAlpha=0.22; ctx.strokeStyle='#000'; ctx.lineWidth=2;
    for(let r=0;r<=ROWS;r++){ const y=GRID_TOP+r*CELL_H; line(GRID_LEFT,y, GRID_LEFT+COLS*CELL_W,y); }
    for(let c=0;c<=COLS;c++){ const x=GRID_LEFT+c*CELL_W; line(x,GRID_TOP, x, GRID_TOP+ROWS*CELL_H); }
    ctx.restore();

    // Player
    const pimg = (player.shootFx>0 && SPR.playerA) ? SPR.playerA : SPR.player;
    drawCenterByHeight(pimg, player.x+player.w/2, player.y+player.h/2, 96, '#ffd1a3');

    // Mower markers
    for(let r=0;r<ROWS;r++){ ctx.fillStyle = laneMowerReady[r] ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.08)'; ctx.fillRect(GRID_LEFT_BOUND-6, rowY(r)-CELL_H*0.35, 4, CELL_H*0.7); }

    // Build ghost
    const ghostH=72;
    if(buildMode && hoverCell && buildMode!=='guiding'){
      const {row,col}=hoverCell; const cx=colX(col), cy=rowY(row);
      const price=costForBuild(buildMode); const canPlace=(player.omens>=price);
      let img=null, fb='#fff';
      if(buildMode==='blight'){ img=SPR.blight; fb='#6e7f50'; }
      if(buildMode==='healing'){ img=SPR.healing; fb='#9bd3ff'; }
      if(buildMode==='agathys'){ img=SPR.agathys; fb='#a5f5ff'; }
      if(buildMode==='moonbeam'){ img=SPR.moonbeamBody; fb='#d7e0ff'; }
      ctx.save(); ctx.globalAlpha=0.45; if(!canPlace) ctx.filter='grayscale(100%)'; drawCenterByHeight(img,cx,cy,ghostH,fb); ctx.restore();
      const x=GRID_LEFT+col*CELL_W, y=GRID_TOP+row*CELL_H;
      ctx.save(); ctx.lineWidth=3; ctx.strokeStyle=canPlace?'rgba(80,220,120,.9)':'rgba(255,90,90,.9)'; ctx.strokeRect(x+2,y+2,CELL_W-4,CELL_H-4); ctx.restore();
      ctx.save(); ctx.font='700 14px system-ui,Segoe UI,Roboto'; ctx.textAlign='center';
      ctx.fillStyle=canPlace?'rgba(210,255,220,.95)':'rgba(255,190,190,.95)'; ctx.fillText(`Cost: ${price}`, cx, cy+ghostH/2+14); ctx.restore();
    }

    // Towers
    for(const t of towers){
      const L = Math.min(3, t.level||1);
      const atk = (t.attackFx>0);
      let img=null, fb='#fff', flip=false;
      let drawH=72;
      if(!t.dead && t.type==='agathys' && L===3) drawH = 72*1.3; // bigger knight L3

      if(t.dead){
        const dk = deadKeyFor(t); img = SPR[dk] || (t.type==='blight'?SPR.blight: t.type==='healing'?SPR.healing: t.type==='agathys'?SPR.agathys:SPR.moonbeamBody);
        fb = (t.type==='blight')?'#6e7f50': (t.type==='healing')?'#f7ff99': (t.type==='agathys')?'#9dc3ff':'#d7e0ff';
      }else{
        if(t.type==='blight'){
          const idle = SPR[ ['blight','blight2','blight3'][L-1] ]; const pose = SPR[ ['blightA','blight2A','blight3A'][L-1] ] || idle;
          img = atk ? pose : idle; fb='#6e7f50';
        } else if(t.type==='healing'){
          const idle = SPR[ ['healing','healing2','healing3'][L-1] ]; const pose = SPR[ ['healingA','healing2A','healing3A'][L-1] ] || idle;
          img = atk ? pose : idle; fb='#f7ff99';
        } else if(t.type==='agathys'){
          const idle = SPR[ ['agathys','agathys2','agathys3'][L-1] ]; const pose = SPR[ ['agathysA','agathys2A','agathys3A'][L-1] ] || idle;
          img = atk ? pose : idle; fb='#9dc3ff';
        } else if(t.type==='moonbeam'){
          const idle = SPR[ ['moonbeamBody','moonbeamBody2','moonbeamBody3'][L-1] ]; const pose = SPR[ ['moonbeamAttack','moonbeamAttack2','moonbeamAttack3'][L-1] ] || idle;
          img = atk ? pose : idle; fb='#d7e0ff';
        }
        if(t.possessed) flip=true;
      }

      // health-based blinking (no HP bars)
      let alpha=1;
      if(!t.dead && t.hp < t.maxhp){
        const r = Math.max(0, Math.min(1, t.hp/t.maxhp));
        const speed = 0.8 + (1-r)*3.2; const pulse = (Math.sin(time*6.28318*speed)+1)/2; const dip = 0.35*(1-r);
        alpha = 1 - dip*pulse;
      }
      ctx.save(); ctx.globalAlpha = alpha;
      drawCenterByHeight(img, t.x, t.y, drawH, fb, flip, t.drawOffX||0);
      ctx.restore();
    }

    // Moonbeam visual
    for(const b of beams){
      const y=rowY(b.row)-CELL_H/2 + (b.dy||0);
      const h=b.thick||24; const xStart = b.cx; const wBeam = W - xStart;
      ctx.save(); ctx.globalAlpha=0.85;
      if(SPR.moonbeamTex){ ctx.drawImage(SPR.moonbeamTex, 0, 0, 1024, 512, xStart, y + CELL_H/2 - h/2, wBeam, h); }
      else { ctx.fillStyle='rgba(220,240,255,0.35)'; ctx.fillRect(xStart, y + CELL_H/2 - h/2, wBeam, h); }
      ctx.restore();
    }

    // Enemies
    for(const e of enemies){
      let img=null;
      if(e.type==='boss'){ img=(e.state==='attack'&&SPR.bossAtk)? SPR.bossAtk : (e.anim%0.6<0.3&&SPR.boss2? SPR.boss2 : SPR.boss); }
      else if(e.type==='fast'){ img=(e.anim%0.2<0.1&&SPR.fast2? SPR.fast2 : SPR.fast); }
      else if(e.type==='vex'){ img=SPR.vex || SPR.weak; }
      else { img=(e.state==='attack'&&SPR.weakAtk)? SPR.weakAtk : (e.anim%0.6<0.3&&SPR.weak2? SPR.weak2 : SPR.weak); }
      drawSprite(img, e.x, e.y, e.w, e.h, '#f5a4a4');
    }

    // Projectiles
    for(const p of projectiles){
      let img=SPR.draw, H=24;
      if(p.kind==='guiding'){ img=SPR.guiding||SPR.draw; H=26; }
      else if(p.kind==='fireball'){ img=SPR.fireball||SPR.draw; H=24; }
      else if(p.kind==='meteor'){ img=SPR.meteor||SPR.draw; H=38; }
      else if(p.src==='mage'){ img=SPR.magicmissile||SPR.draw; H=20; }
      drawCenterByHeight(img, p.x, p.y, H, '#9bd3ff');
    }

    // Effects
    for(let i=effects.length-1;i>=0;i--){
      const fx=effects[i]; fx.t+=1/60; const u=fx.t/fx.life;
      if(fx.type==='coin'){ const y=fx.y - 22*u; ctx.save(); ctx.globalAlpha=1-u; ctx.fillStyle='#ffe680'; ctx.beginPath(); ctx.arc(fx.x,y,8,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      else if(fx.type==='heal'){ const y=fx.y - 18*u; ctx.save(); ctx.globalAlpha=1-u; ctx.fillStyle='rgba(120,240,180,0.9)'; ctx.beginPath(); ctx.arc(fx.x,y,7,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      else if(fx.type==='lbolt'){ // lightning column
        ctx.save(); ctx.globalAlpha=1-u; const x=fx.x; const y0=fx.y0; const y1=fx.y1;
        if(SPR.lightning){ const h=Math.max(20, y1-y0); const w=24; ctx.drawImage(SPR.lightning, x-w/2, y0, w, h); }
        else { ctx.strokeStyle='rgba(200,220,255,.9)'; ctx.lineWidth=4; line(x, y0, x, y1); }
        ctx.restore();
      }
      else {
        const big = (fx.type==='gboom' || fx.type==='mboom');
        const mid = (fx.type==='fboom' || fx.type==='lboom');
        const s = (big? 80 : mid? 56 : 40) * (0.5 + 0.5*u);
        let img = SPR.explosionPng || SPR.explosionJpg;
        if(fx.type==='dboomhit' && SPR.drawBoom) img = SPR.drawBoom;
        if(fx.type==='fboom' && SPR.fireballBoom) img = SPR.fireballBoom;
        if(fx.type==='lboom' && SPR.lightBoom) img = SPR.lightBoom;
        drawSprite(img, fx.x-s/2, fx.y-s/2, s, s, '#ffb347');
      }
      if(fx.t>fx.life) effects.splice(i,1);
    }

    // Penumbra overlay
    if(penFx>0){ const k=penFx/2.2; ctx.save(); ctx.fillStyle=`rgba(80,40,120,${0.35*Math.min(1,k*1.6)})`; ctx.fillRect(0,0,W,H);
      ctx.font='700 26px system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(240,230,255,0.95)'; ctx.textAlign='center'; ctx.fillText('PENUMBRA — next tower costs –3', W/2, 50); ctx.restore(); }

    // HUD
    ctx.font='700 18px system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.textAlign='left';
    ctx.fillText('P to Pause', 14, 22);
    ctx.textAlign='right'; ctx.fillText(`Omens: ${player.omens}`, W-14, 22);
    ctx.fillText(`Wave: ${wave}`, W-14, 44);
  }
})();
