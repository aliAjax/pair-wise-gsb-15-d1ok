import {test,expect} from '@playwright/test';
test.describe.serial('敏感字段分级、遮罩与审计',()=>{
 test('预览按角色重算：无权限遮罩，有权限查看留痕，切角色不沿用',async({page})=>{
  await page.goto('/workflows/wf-1/preview');
  // 默认角色（采购专员）无权限：只见遮罩，DOM 中无原文
  await expect(page.getByTestId('sec-field-phone')).toContainText('138****5678');
  await expect(page.getByTestId('sec-field-phone')).not.toContainText('13812345678');
  await expect(page.getByTestId('sec-field-bankcard')).toContainText('6222 **** **** 3445');
  // 切到有权限角色，查看原文并留痕
  await page.getByLabel('当前角色').selectOption('财务审批人');
  await page.getByTestId('reveal-phone').click();
  await expect(page.getByTestId('sec-field-phone')).toContainText('13812345678');
  await expect(page.getByTestId('preview-audit-count')).toContainText('1 次');
  // 切回无权限角色：重新遮罩，不沿用上一角色的查看结果
  await page.getByLabel('当前角色').selectOption('采购专员');
  await expect(page.getByTestId('sec-field-phone')).toContainText('138****5678');
  await expect(page.getByTestId('sec-field-phone')).not.toContainText('13812345678');
 });
 test('监控实例：按角色遮罩、查看留痕含角色节点时间并按次累计',async({page})=>{
  await page.goto('/monitor?instance=INS-2026-0001');
  await expect(page.getByTestId('instance-detail')).toBeVisible();
  // 默认角色无权限
  await expect(page.getByTestId('sec-field-phone')).toContainText('138****0000');
  await expect(page.getByTestId('sec-field-phone')).not.toContainText('13810000000');
  // 切到有权限角色，分次查看两个字段，按次累计
  await page.getByLabel('当前角色').selectOption('财务审批人');
  await page.getByTestId('reveal-phone').click();
  await expect(page.getByTestId('sec-field-phone')).toContainText('13810000000');
  await expect(page.getByTestId('audit-count')).toHaveText('1');
  await page.getByTestId('reveal-bankcard').click();
  await expect(page.getByTestId('audit-count')).toHaveText('2');
  // 留痕包含角色、节点和时间
  await expect(page.getByTestId('audit-list')).toContainText('财务审批人');
  await expect(page.getByTestId('audit-list')).toContainText('直属主管审批');
  await expect(page.getByTestId('audit-list')).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  // 切角色后重算：已查看的原文重新遮罩
  await page.getByLabel('当前角色').selectOption('HRBP');
  await expect(page.getByTestId('sec-field-phone')).toContainText('138****0000');
  await expect(page.getByTestId('sec-field-phone')).not.toContainText('13810000000');
 });
 test('导出实例敏感字段保持遮罩',async({page})=>{
  await page.goto('/monitor');
  const download=page.waitForEvent('download');
  await page.getByTestId('export-csv').click();
  const path=await (await download).path();
  const fs=await import('fs');
  const csv=fs.readFileSync(path!,'utf-8');
  expect(csv).toContain('138****0000');
  expect(csv).not.toContain('13810000000');
  await expect(page.getByRole('status')).toContainText('敏感字段保持遮罩');
 });
 test('敏感字段缺可见角色拦截发布并指出节点和字段',async({page})=>{
  await page.goto('/workflows/wf-5');
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('issues-panel')).toContainText('敏感字段「手机号」未指定可见角色');
  await expect(page.getByTestId('issues-panel')).toContainText('节点：提交申请');
  await page.getByTestId('publish-button').click();
  await expect(page.getByRole('status')).toContainText('问题');
  await expect(page.locator('.draft-indicator')).toContainText('草稿');
 });
 test('审批节点引用已删除的敏感字段拦截发布',async({page})=>{
  await page.goto('/workflows/wf-9');
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('issues-panel')).toContainText('审批节点引用了已删除的敏感字段「id-card」');
  await expect(page.getByTestId('issues-panel')).toContainText('节点：直属主管审批');
  await page.getByTestId('publish-button').click();
  await expect(page.getByRole('status')).toContainText('问题');
  await expect(page.locator('.draft-indicator')).toContainText('草稿');
 });
 test('编辑器删除敏感字段后校验指出悬空引用',async({page})=>{
  await page.goto('/workflows/wf-1');
  await page.getByTestId('canvas-node-form').click();
  await page.getByTestId('remove-field-phone').click();
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('issues-panel')).toContainText('审批节点引用了已删除的敏感字段「phone」');
 });
});
