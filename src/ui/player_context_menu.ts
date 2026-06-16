export type PlayerContextActionId =
  | 'whisper'
  | 'invite'
  | 'friend'
  | 'unfriend'
  | 'ginvite'
  | 'ignore'
  | 'report'
  | 'close';

export interface PlayerContextAction {
  id: PlayerContextActionId;
  label: string;
}

export interface ChatPlayerContextState {
  playerName: string;
  selfName: string;
  online: boolean;
  isFriend: boolean;
  ignored: boolean;
  canGuildInvite: boolean;
  alreadyGuilded: boolean;
  canReport: boolean;
}

export function chatPlayerContextActions(state: ChatPlayerContextState): PlayerContextAction[] {
  const samePlayer = state.playerName.toLowerCase() === state.selfName.toLowerCase();
  const actions: PlayerContextAction[] = [];

  if (!samePlayer) {
    actions.push({ id: 'whisper', label: 'Whisper' });
    actions.push({ id: 'invite', label: 'Invite to Party' });
    if (state.online) {
      actions.push({ id: state.isFriend ? 'unfriend' : 'friend', label: state.isFriend ? 'Remove Friend' : 'Add Friend' });
    }
    if (state.canGuildInvite && !state.alreadyGuilded) actions.push({ id: 'ginvite', label: 'Invite to Guild' });
    actions.push({ id: 'ignore', label: `${state.ignored ? 'Unignore' : 'Ignore'}${state.online ? '' : ' Chat'}` });
    if (state.canReport) actions.push({ id: 'report', label: 'Report Player' });
  }

  actions.push({ id: 'close', label: 'Cancel' });
  return actions;
}
