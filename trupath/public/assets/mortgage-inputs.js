export function initialMortgageInfoView(f){return f.mortgageSource==='original'?'original':'statement';}
export function statementMode(f){return f.escrowMode==='total'?'total':'pi';}
export function statementAmountKnown(f,mode=statementMode(f)){return mode==='pi'?!!f.statementPiKnown:!!f.statementEscrowKnown;}
export function chooseMortgageSource(f,choice){
 const source=choice==='statement'&&!statementAmountKnown(f)?'estimate':choice;
 return {...f,mortgageSource:source};
}
export function chooseStatementMode(f,mode){const next={...f,escrowMode:mode};return {...next,mortgageSource:statementAmountKnown(next)?'statement':'estimate'};}
export function recordStatementAmount(f,key,value){return {...f,[key]:value,mortgageSource:'statement',escrowMode:key==='pi'?'pi':'total',[key==='pi'?'statementPiKnown':'statementEscrowKnown']:true};}
