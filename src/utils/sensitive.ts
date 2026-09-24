import type {FlowNode, FormField, SensitiveGrant} from '../types';

export const SENSITIVE_TYPES = ['phone', 'bankcard'] as const;

/** 取表单节点上定义的全部字段 */
export function getFormFields(nodes: FlowNode[]): FormField[] {
  return nodes.find(n => n.type === 'form')?.data.config.fields ?? [];
}

export function isSensitiveField(f: Pick<FormField, 'sensitivity' | 'type'>): boolean {
  return f.sensitivity === 'sensitive' || (SENSITIVE_TYPES as readonly string[]).includes(f.type);
}

/** 手机号保留前 3 后 2，银行卡保留前 4 后 4，其余统一 6 位星号 */
export function maskValue(raw: string, type?: string): string {
  const v = raw ?? '';
  if (!v) return '';
  if (type === 'phone') return v.length <= 5 ? '****' : v.slice(0, 3) + '****' + v.slice(-2);
  if (type === 'bankcard') return v.length <= 8 ? '****' : v.slice(0, 4) + ' **** **** ' + v.slice(-4);
  return '******';
}

/** 节点上配置的敏感字段授权 */
export function getGrants(node: FlowNode | undefined): SensitiveGrant[] {
  return (node?.data.config.sensitiveGrants as SensitiveGrant[] | undefined) ?? [];
}

/** 某角色在某审批节点是否被授予某敏感字段的原文查看权 */
export function canReveal(node: FlowNode | undefined, fieldId: string, role: string): boolean {
  return getGrants(node).some(g => g.fieldId === fieldId && g.roles.includes(role));
}

/**
 * 组装导出行 / 复制文本时的口径（页面实现）：
 * 普通字段直接取原文；敏感字段必须由页面确认“已揭示并留痕”后才给原文，
 * 否则一律使用 maskValue —— 从而保证复制与导出都不可能夹带未授权明文。
 */

/** 审计时间戳：YYYY-MM-DD HH:mm:ss */
export function auditTime(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 导出 CSV：导出内容只包含传入的“可见行”。
 * 调用方负责在组装 rows 时按角色重算，未授权（或未点过查看原文）的值只能是遮罩。
 */
export function exportCsv(filename: string, rows: { label: string; value: string }[]): void {
  const esc = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r => `${esc(r.label)},${esc(r.value)}`).join('\r\n');
  const blob = new Blob(['﻿字段,可见内容\r\n' + body], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 复制文本（navigator.clipboard 不可用时降级），复制的只是当前可见内容 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
