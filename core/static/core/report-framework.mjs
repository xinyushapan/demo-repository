// Curated references: models must not generate or replace these citations.
export const references = [
  {id:'NAEYC', author:'National Association for the Education of Young Children', year:2020, title:'Developmentally Appropriate Practice: Observing, Documenting, and Assessing Children’s Development and Learning', url:'https://www.naeyc.org/resources/position-statements/dap/assessing-development/', scope:'观察方法参考：在真实活动中持续记录，结合儿童表达与情境理解。原指南面向出生至小学低年级；本项目只借鉴记录原则，不据此评定发展水平。'},
  {id:'HARVARD', author:'Center on the Developing Child at Harvard University', year:2014, title:'Enhancing and Practicing Executive Function Skills with Children from Infancy to Adolescence', url:'https://developingchild.harvard.edu/resources/handouts-tools/activities-guide-enhancing-and-practicing-executive-function-skills/', scope:'分龄活动设计参考：3–5、5–7、7–12岁章节。下列沙盘活动是项目对游戏原则的改编，不是原文练习、标准化测试或训练效果证明。'},
  {id:'AAP', author:'Yogman M, Garner A, Hutchinson J, Hirsh-Pasek K, Golinkoff RM, et al.', year:2018, title:'The Power of Play: A Pediatric Role in Enhancing Development in Young Children. Pediatrics, 142(3), e20182058.', url:'https://doi.org/10.1542/peds.2018-2058', scope:'游戏研究背景：支持适龄游戏及亲子互动的重要性；不能据此认定本产品、单次线上沙盘或某位儿童已获得发展改善。DOI: 10.1542/peds.2018-2058。'}
];

export function observationRecord(report, names={}) {
  const pieces=Array.isArray(report.pieces)?report.pieces:[];
  const events=Array.isArray(report.events)?report.events:[];
  const userWords=(Array.isArray(report.history)?report.history:[]).filter(h=>h?.role==='user'&&typeof h.text==='string'&&h.text.trim()).map(h=>h.text);
  if(typeof report.selfReport==='string'&&report.selfReport.trim())userWords.push(report.selfReport);
  const counts=new Map();for(const p of pieces)if(p?.type)counts.set(p.type,(counts.get(p.type)||0)+1);
  return {
    facts:[{id:'P1',text:pieces.length?`保存时有${pieces.length}件物件：${[...counts].map(([type,n])=>`${names[type]||type}×${n}`).join('、')}。`:'保存时未记录物件。'},
      {id:'E1',text:events.length?`操作日志共${events.length}条，其中放入／进入画面${events.filter(e=>['放入','进入画面'].includes(e?.action)).length}次、移动${events.filter(e=>e?.action==='移动').length}次。操作次数不等于能力或情绪评分。`:'本次没有操作日志，不能还原搭建顺序。'}],
    statements:userWords.map((text,i)=>({id:`U${i+1}`,text})),
    limits:'本报告仅覆盖当前浏览器保存的一次活动。截图与日志可能不完整，摄像头识别结果需人工核对；未记录的行为不代表未发生。未收集多次观察、家庭或教师信息，不能推断人格、情绪、心理问题或发展水平。奖项是创作纪念，不是评价依据。'
  };
}

export function activitiesFor(age) {
  const common={title:'让孩子带领游戏',text:'由孩子决定摆什么、何时结束。成人可以描述眼前的动作，再问“你想介绍哪一部分？”；孩子不想说时，可以一起安静玩。',sources:['AAP','NAEYC']};
  const activities={
    '3-5':{title:'3–5岁 · 角色小故事',text:'选两件喜欢的物件，由孩子决定角色和情节；成人跟随角色回应。想改变故事时，可以一起商量新玩法。参考指南3–5岁想象游戏原则。'},
    '6-7':{title:'6–7岁 · 轮流搭建',text:'先商量一条简单规则，例如轮流放一件物件；玩一会儿后由孩子提出是否换规则。成人按需要示范，不要求速度或正确率。参考指南5–7岁规则游戏原则。'},
    '8-12':{title:'8–12岁 · 计划与调整',text:'邀请孩子自己选一个搭建目标，先说说计划，再试一试；遇到困难可以换一种方案，最后介绍哪里做了调整。参考指南7–12岁策略与计划游戏原则。'}
  };
  return activities[age]?[{...activities[age],sources:['HARVARD']},common]:[common];
}
