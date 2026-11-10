import {projectScenario} from './projections.js?v=43';
// Custom chart payments add the same extra to each scenario's changing required payments.
export function chartComparison(comparison,strategy,extra=0,{mode='extra',totalBudget=0}={}){
 if(strategy!=='custom')return comparison;
 if(mode==='total'){if(!Number.isFinite(totalBudget)||totalBudget<0||totalBudget>100000000)throw new RangeError('Invalid total monthly budget');return {...comparison,chartBudget:totalBudget,scenarios:comparison.scenarios.map(s=>s.error?s:{...s,custom:projectScenario(s,{horizon:comparison.horizon,budget:totalBudget})})};}
 if(!Number.isFinite(extra)||extra<0||extra>100000000)throw new RangeError('Invalid extra monthly payment');
 return {...comparison,chartExtra:extra,scenarios:comparison.scenarios.map(s=>s.error?s:{...s,custom:extra===0?s.required:projectScenario(s,{horizon:comparison.horizon,extraPayment:extra})})};
}
