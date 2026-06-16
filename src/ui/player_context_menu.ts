import { t } from './i18n';

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
    actions.push({ id: 'whisper', label: t('hud.chat.context.whisper') });
    actions.push({ id: 'invite', label: t('hud.chat.context.invite') });
    if (state.online) {
      actions.push({ id: state.isFriend ? 'unfriend' : 'friend', label: state.isFriend ? t('hud.chat.context.removeFriend') : t('hud.chat.context.addFriend') });
    }
    if (state.canGuildInvite && !state.alreadyGuilded) actions.push({ id: 'ginvite', label: t('hud.chat.context.inviteGuild') });
    actions.push({ id: 'ignore', label: state.ignored
      ? (state.online ? t('hud.chat.context.unignore') : t('hud.chat.context.unignoreChat'))
      : (state.online ? t('hud.chat.context.ignore') : t('hud.chat.context.ignoreChat')) });
    if (state.canReport) actions.push({ id: 'report', label: t('hud.chat.context.report') });
  }

  actions.push({ id: 'close', label: t('hud.chat.context.cancel') });
  return actions;
}
