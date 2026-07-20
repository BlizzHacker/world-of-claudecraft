// In-game Diablo-styled skill-tree viewer for the Infernal realm. Reads the
// authentic skill data (src/sim/realms/infernal_skills) and renders a class's
// three trees in the dark stone D2 skill-calculator style. Display layer of the
// Infernal skill system; a later layer wires selected skills to castable
// abilities with real elemental VFX. Plain DOM, English operator/player copy.

import { type InfernalSkill, infernalSkillsetFor } from '../../sim/realms/infernal_skills';

const MODAL_ID = 'cr-infernal-skilltree';

const ELEMENT_COLOR: Record<string, string> = {
  fire: '#e0662a',
  cold: '#5bc0f0',
  lightning: '#f0d24a',
  poison: '#7ac74a',
  magic: '#b07de0',
  holy: '#f4e6a0',
  physical: '#cdb389',
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function skillCell(skill: InfernalSkill): string {
  const color = (skill.element && ELEMENT_COLOR[skill.element]) || '#cdb389';
  const tag = skill.element ? skill.element : skill.kind;
  return `
    <div title="${escapeHtml(skill.desc)}" style="border:1px solid #3a2c19;border-radius:8px;background:#16110b;
      padding:8px 9px;display:flex;flex-direction:column;gap:2px;min-height:56px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;border-radius:2px;background:${color};box-shadow:0 0 6px ${color}"></span>
        <strong style="font-size:12.5px;color:#f4e6c8">${escapeHtml(skill.name)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;color:#8f7a54;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">
        <span>${escapeHtml(tag)}</span><span>Lv ${skill.req}</span>
      </div>
      <div style="color:#c9b48a;font-size:11px;line-height:1.35">${escapeHtml(skill.desc)}</div>
    </div>`;
}

function closeTree(): void {
  document.getElementById(MODAL_ID)?.remove();
}

/** Open the Diablo skill-tree viewer for a canonical hero class name. Returns
 *  false if that class has no skill data yet (the caller can hide its button). */
export function openInfernalSkillTree(className: string): boolean {
  const set = infernalSkillsetFor(className);
  if (!set) return false;
  closeTree();
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.82);display:flex;' +
    'align-items:center;justify-content:center;padding:16px';
  const columns = set.trees
    .map(
      (tree) => `
      <div style="flex:1 1 0;min-width:0;background:#100c08;border:1px solid #4a3720;border-radius:10px;overflow:hidden">
        <div style="padding:9px 12px;text-align:center;font-weight:700;letter-spacing:1px;color:#f0c987;
          text-transform:uppercase;border-bottom:1px solid #3a2c19;background:#1c140c">${escapeHtml(tree.name)}</div>
        <div style="display:flex;flex-direction:column;gap:7px;padding:10px">
          ${tree.skills.map(skillCell).join('')}
        </div>
      </div>`,
    )
    .join('');
  modal.innerHTML = `
    <div style="width:min(1080px,97vw);max-height:92vh;overflow:auto;background:#0b0805;
      border:1px solid #7a5a2a;border-radius:12px;color:#f4e6c8;font:14px system-ui,sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #3a2c19">
        <strong style="font-size:17px">${escapeHtml(set.className)} Skill Tree
          <span style="color:#8f7a54;font-weight:500;font-size:13px">(${escapeHtml(set.source)})</span></strong>
        <button data-close style="background:none;border:1px solid #7a5a2a;color:#f4e6c8;border-radius:6px;padding:4px 12px;cursor:pointer">Close</button>
      </div>
      <div style="display:flex;gap:12px;padding:14px;align-items:flex-start">${columns}</div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-close]')?.addEventListener('click', closeTree);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeTree();
  });
  return true;
}

/** True if a class has skill-tree data (so the caller can show a button). */
export function hasInfernalSkillTree(className: string): boolean {
  return infernalSkillsetFor(className) !== null;
}
