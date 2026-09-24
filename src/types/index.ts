export type WorkflowStatus='draft'|'published'|'archived';
export type NodeKind='start'|'form'|'approval'|'condition'|'automation'|'notify'|'end';
export type NodeState='unconfigured'|'configuring'|'valid'|'invalid';
export type FieldType='text'|'number'|'amount'|'date'|'select'|'attachment'|'phone'|'bankcard';
export type Sensitivity='normal'|'sensitive';
export interface FormField {id:string;label:string;type:FieldType;sensitivity:Sensitivity;required:boolean;options?:string[]}
/** 审批节点对敏感字段的原文查看授权：哪些角色可以在该节点看到原文 */
export interface SensitiveGrant {fieldId:string;roles:string[]}
export interface FlowNode {id:string;type:NodeKind;position:{x:number;y:number};data:{label:string;state:NodeState;config:Record<string,any>}}
export interface FlowEdge {id:string;source:string;target:string;label?:string}
export interface Version {version:number;createdAt:string;note:string;nodes:FlowNode[];edges:FlowEdge[]}
export interface Workflow {id:string;name:string;domain:string;status:WorkflowStatus;version:number;editor:string;updatedAt:string;publishedAt?:string;abnormalCount:number;nodes:FlowNode[];edges:FlowEdge[];versions:Version[]}
/** 敏感字段原文查看审计记录：同一实例按次累计 */
export interface SensitiveAudit {id:string;instanceId:string;fieldId:string;fieldLabel:string;nodeId:string;nodeLabel:string;role:string;time:string}
export interface Instance {id:string;workflowId:string;applicant:string;domain:string;currentNode:string;status:'abnormal'|'timeout'|'running'|'completed';submittedAt:string;duration:string;risk:'high'|'medium'|'low';formData:Record<string,string>;timeline:{title:string;time:string;status:string}[]}
export interface ValidationIssue {nodeId:string;level:'error'|'warning';message:string}
