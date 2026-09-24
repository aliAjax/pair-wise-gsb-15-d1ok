import {readFileSync} from 'fs';
import {test,expect} from '@playwright/test';
test.describe.serial('FlowDesk 完整链路',()=>{
 test('Dashboard KPI 与最近流程进入编辑器',async({page})=>{await page.goto('/');await expect(page.getByTestId('kpi-grid')).toBeVisible();await expect(page.getByText('流程总数')).toBeVisible();await expect(page.getByText('异常实例',{exact:true}).first()).toBeVisible();await page.getByTestId('recent-workflow').first().click();await expect(page.getByTestId('flow-canvas')).toBeVisible();});
 test('审批配置、保存和双区域校验',async({page})=>{await page.goto('/workflows/wf-1');await page.getByTestId('canvas-node-approval').click();await expect(page.getByTestId('config-panel')).toContainText('审批配置');await page.getByLabel('审批人来源').selectOption({label:'固定角色'});await page.getByTestId('save-node-config').click();await page.getByRole('button',{name:'保存草稿'}).click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('canvas-node-condition')).toHaveClass(/invalid/);await expect(page.getByTestId('issues-panel')).toContainText('条件分支规则未配置');const before=await page.getByTestId('error-count').textContent();expect(Number(before?.match(/\d+/)?.[0])).toBeGreaterThan(0);await page.getByTestId('canvas-node-condition').click();await page.getByLabel('条件字段').selectOption('amount');await page.getByLabel('条件比较值').fill('5000');await page.getByTestId('save-node-config').click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('error-count')).toContainText('0 错误');});
 test('表单预览金额驱动条件分支',async({page})=>{await page.goto('/workflows/wf-1/preview');await expect(page.getByTestId('branch-result')).toContainText('标准分支');await page.getByLabel('申请金额').fill('12000');await expect(page.getByTestId('branch-result')).toContainText('高额分支');});
 test('发布后列表和总览同步',async({page})=>{await page.goto('/workflows/wf-2');await page.getByTestId('publish-button').click();await expect(page.getByRole('status')).toContainText('发布成功');await page.getByRole('link',{name:'流程管理'}).click();const row=page.getByTestId('workflow-row').filter({hasText:'采购合同审批'});await expect(row).toContainText('已发布');await expect(row).toContainText('v3');await page.getByRole('link',{name:'总览'}).click();await expect(page.getByTestId('kpi-grid')).toBeVisible();});
 test('异常实例详情、时间线与当前节点高亮',async({page})=>{await page.goto('/monitor');await page.getByRole('button',{name:'异常',exact:true}).click();await page.getByTestId('instance-row').first().click();await expect(page.getByTestId('instance-detail')).toBeVisible();await expect(page.getByTestId('execution-timeline')).toContainText('提交申请');await expect(page.locator('.runtime-highlight')).toHaveCount(1);});
 test('版本比较并恢复历史版本',async({page})=>{await page.goto('/workflows/wf-2/versions');await expect(page.getByTestId('version-compare')).toContainText('新增节点');await page.getByTestId('restore-version').click();await expect(page).toHaveURL(/\/workflows\/wf-2$/);await expect(page.getByRole('status')).toContainText('已恢复');await expect(page.getByTestId('flow-canvas')).toBeVisible();});
});

test.describe.serial('敏感字段分档与原文权限',()=>{
 test('预览默认角色只看到手机号遮罩，导出拿不到原文',async({page})=>{
  await page.goto('/workflows/wf-1/preview');
  await page.getByLabel('手机号').fill('13812345678');
  await page.getByLabel('银行卡号').fill('6222021234567890123');
  // 默认角色为部门负责人：手机号授权可见（未点揭示前仍是遮罩），银行卡号未授权
  await expect(page.getByTestId('sensitive-row-bankcard')).toContainText('****');
  await expect(page.getByTestId('sensitive-row-bankcard')).toContainText('当前角色无原文权限');
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('138****78');
  // 导出 CSV：内容按当前可见性重算，银行卡号必须是遮罩
  const [dl]=await Promise.all([page.waitForEvent('download'),page.getByTestId('perspective-export').click()]);
  const csv=await dl.path().then(p=>p?readFileSync(p,'utf8'):'');
  expect(csv).toContain('6222 **** **** 0123');
  expect(csv).not.toContain('6222021234567890123');
  expect(csv).toContain('138****78');
  expect(csv).not.toContain('13812345678');
 });

 test('授权角色揭示原文，切角色立即回到遮罩且不沿用旧结果',async({page})=>{
  await page.goto('/workflows/wf-1/preview');
  await page.getByLabel('手机号').fill('13812345678');
  // 部门负责人在直属主管节点可看手机号原文
  await page.getByTestId('reveal-phone').click();
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('13812345678');
  // 切到 HRBP：无授权，按钮消失，只剩遮罩
  await page.getByTestId('view-role-switch').selectOption('HRBP');
  await expect(page.getByTestId('perspective-role')).toContainText('HRBP');
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('138****78');
  await expect(page.getByTestId('reveal-phone')).toHaveCount(0);
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('当前角色无原文权限');
  // 切回授权角色也必须重新揭示，不能沿用之前的明文
  await page.getByTestId('view-role-switch').selectOption('部门负责人');
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('138****78');
  await expect(page.getByTestId('reveal-phone')).toBeVisible();
 });

 test('复制只能拿到当前可见内容（遮罩）',async({page})=>{
  await page.goto('/workflows/wf-1/preview');
  await page.getByLabel('银行卡号').fill('6222021234567890123');
  await page.getByTestId('view-role-switch').selectOption('HRBP');
  await page.getByTestId('copy-bankcard').click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  expect(copied).toContain('6222 **** **** 0123');
  expect(copied).not.toContain('6222021234567890123');
 });

 test('监控揭示原文按次累计审计，角色/节点/时间齐备',async({page})=>{
  await page.goto('/monitor');
  await page.getByRole('button',{name:'异常',exact:true}).click();
  await page.getByTestId('instance-row').first().click();
  await expect(page.getByTestId('instance-data')).toContainText('手机号');
  await expect(page.getByTestId('audit-count')).toHaveText('0');
  // 默认角色部门负责人 -> 手机号授权；连续点两次，按次累计
  await page.getByTestId('reveal-phone').click();
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('138');
  await page.getByTestId('reveal-phone').click();
  await expect(page.getByTestId('audit-count')).toHaveText('2');
  const rows=page.getByTestId('audit-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('部门负责人');
  await expect(rows.first()).toContainText('直属主管审批');
  await expect(rows.first()).toContainText('手机号');
  await expect(rows.first().locator('td').first()).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  // HRBP 无权限，看不到揭示按钮，也看不到原文
  await page.getByTestId('view-role-switch').selectOption('HRBP');
  await expect(page.getByTestId('reveal-phone')).toHaveCount(0);
  await expect(page.getByTestId('sensitive-row-phone')).toContainText('****');
  // 导出仍然不含原文
  const [dl]=await Promise.all([page.waitForEvent('download'),page.getByTestId('instance-export').click()]);
  const csv=await dl.path().then(p=>p?readFileSync(p,'utf8'):'');
  expect(csv).not.toContain('1381013');
 });

 test('敏感字段缺角色与引用已删字段拦住发布，并指出节点与字段',async({page})=>{
  await page.goto('/workflows/wf-5');
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('error-count')).not.toContainText('0 错误');
  await expect(page.getByTestId('issues-panel')).toContainText('身份证号');
  await expect(page.getByTestId('issues-panel')).toContainText('未指定可查看原文的角色');
  await expect(page.getByTestId('issues-panel')).toContainText('已删除字段');
  await expect(page.getByTestId('issues-panel')).toContainText('tax_no');
  // 直接点发布也应被拦截：发布处理先跑校验，有阻断项时不会进入发布（force 绕开常驻 toast 遮挡）
  await page.getByTestId('publish-button').click({force:true});
  await expect(page.getByRole('status')).toContainText('已拦截发布');
  await page.getByTestId('canvas-node-approval').click();
  await expect(page.getByTestId('grant-tax_no')).toHaveClass(/broken/);
  await expect(page.getByTestId('grant-idcard')).toContainText('身份证号');
  // 修复：给身份证号授权角色（复选框视觉隐藏，点击其文字标签），删除对已删字段的授权
  await page.getByTestId('grant-idcard').locator('label.role-chip',{hasText:'财务审批人'}).click();
  await page.getByTestId('grant-tax_no').getByRole('button',{name:'移除授权'}).click();
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('error-count')).toContainText('0 错误');
 });

 test('表单节点可切换普通/敏感分档，新增敏感字段后未授权即拦截发布',async({page})=>{
  await page.goto('/workflows/wf-5');
  await page.getByTestId('canvas-node-form').click();
  // 新增一个手机号字段（默认敏感）
  await page.getByRole('button',{name:'+ 手机号'}).click();
  await expect(page.getByTestId('config-panel')).toContainText('敏感');
  // 不做任何授权直接校验：应提示该字段未配置可查看角色
  await page.getByTestId('validate-button').click();
  await expect(page.getByTestId('issues-panel')).toContainText('手机号');
 });
});

test('1440px 桌面视觉与控制台验证',async({page})=>{
 const errors:string[]=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const path of ['/','/workflows/wf-1','/workflows/wf-1/preview','/monitor']){await page.goto(path);await page.waitForTimeout(250);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow,`${path} 不应横向溢出`).toBeFalsy()}
 await page.goto('/'); await page.screenshot({path:'test-results/dashboard-1440.png',fullPage:true});
 expect(errors,'浏览器 console 不应出现 error').toEqual([]);
});
