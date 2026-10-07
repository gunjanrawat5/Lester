import { commandResponseSchema, type CommandResponse } from '../src/ai/contracts';
export function interpretCommand(requestId: string, text: string): CommandResponse {
  const normalized = text.toLowerCase().replace(/[,.!?]/g, ' ').replace(/\s+/g, ' ').trim();
  const order = normalized.replace(/^(?:hey )?(?:james bond|bond|007)\s*/, '').replace(/^please\s*/, '').replace(/\s+please$/, '');
  let plan: Omit<CommandResponse, 'requestId' | 'interpreter'> = { mode: 'clarify', actions: [], reply: 'Try “Bond, go to the main hall”, “go to security”, “approach the vault”, or “stop”.' };
  if (/^(?:stop|hold|hold position|wait|cancel|stand down)$/.test(order)) {
    plan = { mode: 'execute', actions: [{ type: 'STOP', agent: 'bond' }], reply: 'Holding position, Q.' };
  } else if (/^(?:get (?:me|everyone) out|escape|extract|return|come back)$/.test(order)) {
    plan = { mode: 'execute', actions: [{ type: 'MOVE', agent: 'bond', target: 'entrance' }], reply: 'Returning to extraction, Q.' };
  } else if (/^(?:what can you do|what are (?:my|our) options|help|commands)$/.test(order)) {
    plan = { mode: 'query', actions: [], reply: 'I can move to the main hall, security, the vault approach, or extraction. Tell me to stop at any time.' };
  } else {
    const match = order.match(/^(?:(?:can|could) you )?(?:go|move|head|walk|proceed|return|come back|scout|check|approach)(?: (?:to|into|toward|towards|out))? (?:the )?(main hall|hall|gallery|security room|security|vault|entrance|extraction)$/);
    if (match) {
      const place = match[1];
      const target = /hall|gallery/.test(place) ? 'gallery' : /security/.test(place) ? 'security' : place === 'vault' ? 'vault' : 'entrance';
      const destination = { gallery: 'the main hall', security: 'security staging', vault: 'the vault approach', entrance: 'extraction' }[target];
      plan = { mode: 'execute', actions: [{ type: 'MOVE', agent: 'bond', target }], reply: `Moving to ${destination}, Q.` };
    }
  }
  return commandResponseSchema.parse({ requestId, interpreter: 'demo-parser', ...plan });
}
