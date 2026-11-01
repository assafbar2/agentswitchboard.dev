/**
 * Share-card renderer: draws the cards lib/share-cards.ts describes, in the
 * house look (white paper, ink rules, signal yellow as a fill only, square
 * corners, Barlow Semi Condensed). Imported by the card.png route handlers
 * only, so next/og never reaches a page bundle.
 */

/* eslint-disable @next/next/no-img-element -- next/og draws plain <img> elements only. */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';
import {
  CARD_SIZE,
  type AlternativesCard,
  type CategoryCard,
  type DropCard,
  type ListingCard,
  type SiteCard,
  type StackCard,
  type StacksCard,
  type TaskCard,
  type TasksCard,
} from './share-cards';
import { formatNumber, joinList, pluralize } from './utils';

const INK = '#111111';
const PAPER = '#ffffff';
const YELLOW = '#FFD400';
const MUTED = '#444444';
const RULE = '#dddddd';
const FONT = 'Barlow Semi Condensed';

const FONT_FILES = {
  500: 'BarlowSemiCondensed-Medium.ttf',
  600: 'BarlowSemiCondensed-SemiBold.ttf',
  800: 'BarlowSemiCondensed-ExtraBold.ttf',
} as const;

type Fonts = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];

let fonts: Promise<Fonts> | undefined;

function loadFonts(): Promise<Fonts> {
  fonts ??= Promise.all(
    Object.entries(FONT_FILES).map(async ([weight, file]) => ({
      name: FONT,
      data: await readFile(path.join(process.cwd(), 'assets', 'fonts', file)),
      weight: Number(weight) as keyof typeof FONT_FILES,
      style: 'normal' as const,
    }))
  );
  return fonts;
}

/** An icon's site path (/icons/<slug>.png?v=…) as a data URI, read from public/. */
async function iconSrc(sitePath: string): Promise<string> {
  const file = path.join(process.cwd(), 'public', sitePath.split('?')[0]);
  return `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
}

async function render(element: ReactElement): Promise<ImageResponse> {
  return new ImageResponse(element, { ...CARD_SIZE, fonts: await loadFonts() });
}

export async function renderSiteCard(card: SiteCard): Promise<ImageResponse> {
  const icons = await Promise.all(card.icons.map(iconSrc));
  return render(
    <Frame footer={<Tags labels={['API', 'MCP', 'CLI', 'Extension']} />}>
      <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
        The AI Agent Directory
      </div>
      <div style={{ display: 'flex', marginTop: 22, fontSize: 30, fontWeight: 500, color: MUTED }}>
        Browse, compare, and integrate AI agents with real API, MCP, and CLI access.
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 34, fontWeight: 800 }}>
        {`${formatNumber(card.agents)} agents · ${formatNumber(card.official)} official · ${card.categories} categories`}
      </div>
      <IconRow icons={icons} size={68} />
    </Frame>
  );
}

export async function renderListingCard(card: ListingCard): Promise<ImageResponse> {
  const icon = card.icon ? await iconSrc(card.icon) : null;
  return render(
    <Frame kicker={card.category} footer={card.access.length > 0 ? <Tags labels={card.access} /> : null}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 40 }}>
        <Icon src={icon} name={card.name} size={152} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'block',
              lineClamp: 2,
              fontSize: nameSize(card.name),
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {card.name}
          </div>
          <div style={{ display: 'flex', marginTop: 12, fontSize: 34, fontWeight: 600, color: MUTED }}>
            {`by ${card.provider}`}
          </div>
          {(card.official || card.verified) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {card.official && <Label>Official</Label>}
              {card.verified && <Label fill={YELLOW}>Verified</Label>}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'block',
          lineClamp: 3,
          marginTop: 26,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.35,
          color: MUTED,
        }}
      >
        {card.description}
      </div>
    </Frame>
  );
}

export async function renderCategoryCard(card: CategoryCard): Promise<ImageResponse> {
  const official = card.official > 0 ? ` · ${formatNumber(card.official)} official` : '';
  return render(
    <Headline
      kicker="Category"
      title={card.name}
      counts={`${formatNumber(card.agents)} ${pluralize(card.agents, 'agent')}${official}`}
      text={card.description}
      icons={await Promise.all(card.icons.map(iconSrc))}
    />
  );
}

export async function renderDropCard(card: DropCard): Promise<ImageResponse> {
  const counts = [
    `+${formatNumber(card.added)} ${pluralize(card.added, 'agent')}`,
    card.official > 0 ? `${formatNumber(card.official)} official` : null,
    card.updated > 0 ? `${formatNumber(card.updated)} updated` : null,
  ];
  const more = card.added - card.names.length;
  const names = card.names.length > 0 ? `${card.names.join(', ')}${more > 0 ? ` and ${formatNumber(more)} more` : ''}` : '';
  return render(
    <Headline
      kicker="Weekly drop"
      title={card.date}
      counts={counts.filter(Boolean).join(' · ')}
      text={names}
      icons={await Promise.all(card.icons.map(iconSrc))}
    />
  );
}

export async function renderAlternativesCard(card: AlternativesCard): Promise<ImageResponse> {
  const [icon, icons] = await Promise.all([card.icon ? iconSrc(card.icon) : null, Promise.all(card.icons.map(iconSrc))]);
  const more = card.alternatives - card.names.length;
  const names = more > 0 ? `${card.names.join(', ')} and ${more} more` : joinList(card.names);
  return render(
    <Frame kicker="Alternatives">
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Icon src={icon} name={card.name} size={112} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: MUTED }}>Alternatives to</div>
          <div
            style={{
              display: 'block',
              lineClamp: 2,
              fontSize: nameSize(card.name),
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {card.name}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', marginTop: 24, fontSize: 34, fontWeight: 800 }}>
        {`${card.alternatives} similar ${pluralize(card.alternatives, 'tool')}${card.category ? ` in ${card.category}` : ''}`}
      </div>
      <div style={{ display: 'block', lineClamp: 1, marginTop: 8, fontSize: 28, fontWeight: 500, color: MUTED }}>
        {names}
      </div>
      <IconRow icons={icons} size={76} />
    </Frame>
  );
}

export async function renderStackCard(card: StackCard): Promise<ImageResponse> {
  const icons = await Promise.all(card.icons.map(iconSrc));
  const counts = `${formatNumber(card.tools)} ${pluralize(card.tools, 'tool')}${card.week ? ` · ${card.week}` : ''}`;
  return render(
    <Frame
      kicker={card.week ? 'Stack of the week' : 'Stack'}
      footer={card.access.length > 0 ? <Tags labels={card.access} /> : null}
    >
      <div
        style={{
          display: 'block',
          lineClamp: 2,
          fontSize: titleSize(card.title),
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {card.title}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 34, fontWeight: 800 }}>{counts}</div>
      <div
        style={{
          display: 'block',
          lineClamp: 2,
          marginTop: 10,
          fontSize: 28,
          fontWeight: 500,
          lineHeight: 1.35,
          color: MUTED,
        }}
      >
        {card.promise}
      </div>
      <IconRow icons={icons} size={76} />
    </Frame>
  );
}

export async function renderStacksCard(card: StacksCard): Promise<ImageResponse> {
  return render(
    <Headline
      kicker="Stacks"
      title="Stacks"
      counts={`${formatNumber(card.stacks)} ${pluralize(card.stacks, 'stack')} · ${formatNumber(card.tools)} ${pluralize(card.tools, 'tool')}`}
      text="AI tools that work together, each stack picked for one job."
      icons={await Promise.all(card.icons.map(iconSrc))}
    />
  );
}

export async function renderTaskCard(card: TaskCard): Promise<ImageResponse> {
  const official = card.official > 0 ? ` · ${formatNumber(card.official)} official` : '';
  return render(
    <Headline
      kicker="Task"
      title={card.title}
      counts={`${formatNumber(card.tools)} ${pluralize(card.tools, 'tool')}${official}`}
      text={card.blurb}
      icons={await Promise.all(card.icons.map(iconSrc))}
    />
  );
}

export async function renderTasksCard(card: TasksCard): Promise<ImageResponse> {
  return render(
    <Headline
      kicker="Tasks"
      title="I need to…"
      counts={`${formatNumber(card.tasks)} ${pluralize(card.tasks, 'task')} · ${formatNumber(card.tools)} ${pluralize(card.tools, 'tool')}`}
      text="Start from the job: each task lists the AI tools that do it, best fit first."
      icons={await Promise.all(card.icons.map(iconSrc))}
    />
  );
}

/** A title, a bold count line, a muted line of up to two rows, and a row of icons along the bottom. */
function Headline({
  kicker,
  title,
  counts,
  text,
  icons,
}: {
  kicker: string;
  title: string;
  counts: string;
  text: string;
  icons: string[];
}) {
  return (
    <Frame kicker={kicker}>
      <div
        style={{
          display: 'flex',
          fontSize: title.length > 24 ? 72 : 92,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 34, fontWeight: 800 }}>{counts}</div>
      {text && (
        <div
          style={{
            display: 'block',
            lineClamp: 2,
            marginTop: 12,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.35,
            color: MUTED,
          }}
        >
          {text}
        </div>
      )}
      <IconRow icons={icons} size={76} />
    </Frame>
  );
}

/** A stack title of up to STACK_TITLE_MAX (70) characters fits two lines at the smallest size. */
function titleSize(title: string): number {
  if (title.length <= 24) return 80;
  if (title.length <= 40) return 68;
  return 60;
}

/** The longest names (about 38 characters) wrap to two lines at the smallest size. */
function nameSize(name: string): number {
  if (name.length <= 16) return 92;
  if (name.length <= 22) return 80;
  if (name.length <= 28) return 68;
  return 60;
}

/** Header strip (yellow name block on a heavy ink rule), body, then a ruled footer with the site's address. */
function Frame({ kicker, footer, children }: { kicker?: string | null; footer?: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: PAPER,
        color: INK,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', height: 100, borderBottom: `6px solid ${INK}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 56px',
            background: YELLOW,
            fontSize: 46,
            fontWeight: 800,
            letterSpacing: '-0.01em',
          }}
        >
          Agent Switchboard
        </div>
        {kicker && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingRight: 64,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 64px 0', overflow: 'hidden' }}>
        {children}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0 64px',
          padding: '18px 0 28px',
          borderTop: `3px solid ${INK}`,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>{footer}</div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 600 }}>agentswitchboard.dev</div>
      </div>
    </div>
  );
}

/** Ink on yellow, like the access-method tags on the site. */
function Tags({ labels }: { labels: string[] }) {
  return (
    <>
      {labels.map((label) => (
        <div
          key={label}
          style={{
            display: 'flex',
            padding: '8px 18px',
            background: YELLOW,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      ))}
    </>
  );
}

function Label({ fill = PAPER, children }: { fill?: string; children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '4px 12px',
        border: `3px solid ${INK}`,
        background: fill,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

/** The site's AgentIcon at card scale: the icon on a white chip, or the name's initial on yellow. */
function Icon({ src, name, size }: { src: string | null; name: string; size: number }) {
  const pad = Math.round(size / 14);
  if (!src) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: size,
          height: size,
          background: YELLOW,
          fontSize: Math.round(size * 0.55),
          fontWeight: 800,
        }}
      >
        {name.match(/[\p{L}\p{N}]/u)?.[0].toUpperCase() ?? '·'}
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        width: size,
        height: size,
        padding: pad,
        background: PAPER,
        border: `2px solid ${RULE}`,
      }}
    >
      <img src={src} alt="" width={size - 2 * pad - 4} height={size - 2 * pad - 4} />
    </div>
  );
}

function IconRow({ icons, size }: { icons: string[]; size: number }) {
  if (icons.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 'auto', paddingBottom: 28 }}>
      {icons.map((src, i) => (
        <Icon key={i} src={src} name="" size={size} />
      ))}
    </div>
  );
}
