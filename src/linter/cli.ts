import fs from 'node:fs';
import type { AkadType, AudienceSegment, ChannelPlatform } from '../types/domain.js';
import { lintCampaignCopy } from './engine.js';

function parseArgs(argv: string[]): {
  text?: string;
  file?: string;
  akadType?: AkadType;
  channel?: ChannelPlatform;
  segment?: AudienceSegment;
} {
  const out: {
    text?: string;
    file?: string;
    akadType?: AkadType;
    channel?: ChannelPlatform;
    segment?: AudienceSegment;
  } = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--text' && next) {
      out.text = next;
      i += 1;
    } else if (arg === '--file' && next) {
      out.file = next;
      i += 1;
    } else if (arg === '--akad' && next) {
      out.akadType = next as AkadType;
      i += 1;
    } else if (arg === '--channel' && next) {
      out.channel = next as ChannelPlatform;
      i += 1;
    } else if (arg === '--segment' && next) {
      out.segment = next as AudienceSegment;
      i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let text = args.text ?? '';
  if (!text && args.file) {
    text = fs.readFileSync(args.file, 'utf8');
  }
  if (!text && !process.stdin.isTTY) {
    text = fs.readFileSync(0, 'utf8');
  }

  const result = lintCampaignCopy({
    text,
    akadType: args.akadType,
    channel: args.channel,
    segment: args.segment
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.passed) {
    process.exitCode = 1;
  }
}

void main();
