'use client';

import { ChevronDown } from 'lucide-react';
import { Menu, type MenuOption } from '@/components/ui/menu';
import { Avatar } from '@/components/ui/avatar';
import { StatusIcon, PriorityIcon } from './indicators';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
  type Member,
} from '@/lib/types';

const triggerClass =
  'flex h-8 w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm transition-colors hover:bg-surface-hover';

export function StatusMenu({
  value,
  onChange,
}: {
  value: IssueStatus;
  onChange: (v: IssueStatus) => void;
}) {
  const options: MenuOption<IssueStatus>[] = STATUSES.map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    icon: <StatusIcon status={s} />,
  }));
  return (
    <Menu
      value={value}
      options={options}
      onChange={onChange}
      trigger={() => (
        <span className={triggerClass}>
          <StatusIcon status={value} />
          <span className="flex-1 text-left">{STATUS_LABEL[value]}</span>
          <ChevronDown size={14} className="text-faint" />
        </span>
      )}
    />
  );
}

export function PriorityMenu({
  value,
  onChange,
}: {
  value: IssuePriority;
  onChange: (v: IssuePriority) => void;
}) {
  const options: MenuOption<IssuePriority>[] = PRIORITIES.map((p) => ({
    value: p,
    label: PRIORITY_LABEL[p],
    icon: <PriorityIcon priority={p} />,
  }));
  return (
    <Menu
      value={value}
      options={options}
      onChange={onChange}
      trigger={() => (
        <span className={triggerClass}>
          <PriorityIcon priority={value} />
          <span className="flex-1 text-left">{PRIORITY_LABEL[value]}</span>
          <ChevronDown size={14} className="text-faint" />
        </span>
      )}
    />
  );
}

const UNASSIGNED = '__none__';

export function AssigneeMenu({
  value,
  members,
  onChange,
}: {
  value: string | null;
  members: Member[];
  onChange: (userId: string | null) => void;
}) {
  const options: MenuOption<string>[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...members.map((m) => ({
      value: m.userId,
      label: m.name,
      icon: <Avatar name={m.name} id={m.userId} src={m.avatarUrl} size="xs" />,
    })),
  ];
  const current = members.find((m) => m.userId === value);
  return (
    <Menu
      value={value ?? UNASSIGNED}
      options={options}
      onChange={(v) => onChange(v === UNASSIGNED ? null : v)}
      trigger={() => (
        <span className={triggerClass}>
          {current ? (
            <Avatar name={current.name} id={current.userId} src={current.avatarUrl} size="xs" />
          ) : (
            <span className="h-5 w-5 rounded-full border border-dashed border-faint" />
          )}
          <span className="flex-1 truncate text-left">{current?.name ?? 'Unassigned'}</span>
          <ChevronDown size={14} className="text-faint" />
        </span>
      )}
    />
  );
}
