import type { WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';

export async function handle(msg: WebviewToHostMessage, _ctx: PanelContext): Promise<void> {
  void msg;
}
