import type {FormField,Workflow} from '../types';
// 敏感字段遮罩：手机号保留前 3 后 4，银行卡保留前 4 后 4，其余只留首尾。
// 注意：无权限角色的 DOM 中只渲染遮罩字符，原文不进入页面，复制/导出均拿不到原文。
export const maskValue=(value:string,type?:string):string=>{
 const v=String(value||'');
 if(!v)return '';
 if(type==='phone')return v.replace(/^(\d{3})\d{4}(\d{4})$/,'$1****$2');
 if(type==='bankcard')return v.replace(/^(\d{4})\d{4,11}(\d{4})$/,'$1 **** **** $2');
 return v.length>4?v.slice(0,2)+'****'+v.slice(-2):'****';
};
// 流程内全部表单字段（可能分布在多个表单节点）
export const formFields=(w:Workflow):FormField[]=>w.nodes.filter(n=>n.type==='form').flatMap(n=>(n.data.config.fields||[]) as FormField[]);
export const sensitiveFields=(w:Workflow):FormField[]=>formFields(w).filter(f=>f.sensitive);
// 字段可见角色 = 各审批节点授权的并集
export const visibleRoles=(w:Workflow,fieldId:string):string[]=>[...new Set(w.nodes.filter(n=>n.type==='approval').flatMap(n=>(n.data.config.fieldRoles?.[fieldId]||[]) as string[]))];
export const canView=(w:Workflow,fieldId:string,role:string):boolean=>!!role&&visibleRoles(w,fieldId).includes(role);
// 授权该角色查看此字段的审批节点（用于审计留痕）
export const grantingNode=(w:Workflow,fieldId:string,role:string)=>w.nodes.find(n=>n.type==='approval'&&((n.data.config.fieldRoles?.[fieldId]||[]) as string[]).includes(role));
