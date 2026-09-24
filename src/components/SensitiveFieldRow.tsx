import {Copy, Eye, EyeOff, ShieldAlert} from 'lucide-react';
import {useAppStore} from '../store/useAppStore';
import type {FormField, FlowNode} from '../types';
import {canReveal, copyText, maskValue} from '../utils/sensitive';

interface Props {
  field: FormField;
  raw: string;
  node?: FlowNode;
  instanceId: string;
  /** 是否已揭示明文：由页面持有，切角色/节点/实例时必须整体重置 */
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onCopied?: () => void;
}

/**
 * 敏感字段展示行（受控）：
 * - 未授权角色永远只能看到遮罩，复制也只能拿到遮罩；
 * - 授权角色点击“查看原文”后由父组件记录审计（角色/节点/时间）并置 revealed；
 * - 复制永远只取当前屏幕上显示的内容，遮罩状态下拿不到原文。
 */
export function SensitiveFieldRow({field, raw, node, revealed, onReveal, onHide, onCopied}: Props) {
  const viewRole = useAppStore(s => s.viewRole);
  const granted = canReveal(node, field.id, viewRole);
  const shown = granted && revealed ? raw || '—' : maskValue(raw || '', field.type) || '—';

  const copy = async () => {
    await copyText(shown);
    onCopied?.();
  };

  return <div className="sensitive-row" data-testid={`sensitive-row-${field.id}`} data-granted={granted}>
    <div className="sensitive-val">{shown}<ShieldAlert className="sensitive-badge"/></div>
    <div className="sensitive-actions">
      {granted
        ? <><button type="button" className="mini ghost" data-testid={`reveal-${field.id}`} onClick={onReveal} title="每次查看都按次留痕"><Eye/>查看原文</button>{revealed&&<button type="button" className="mini ghost" data-testid={`hide-${field.id}`} onClick={onHide}><EyeOff/>收起</button>}</>
        : <small className="no-perm">当前角色无原文权限</small>}
      <button type="button" className="mini ghost" data-testid={`copy-${field.id}`} onClick={copy} title="复制的是当前可见内容"><Copy/>复制</button>
    </div>
  </div>;
}
