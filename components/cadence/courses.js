const mcq = (prompt, options, correct) => ({type:'mcq', prompt, options, accepted:[correct]});
const lesson = (id,title,level,category,explanation,example,guided) => ({id,title,level,category,explanation,example,guided});
export const extraCourses = {
 scientific: [
  lesson('sc-l1','Describing Research Results',3,'Vocabulary','Use suggests for a cautious interpretation and demonstrates for strong evidence. An association alone does not establish causation.','The findings suggest an association between sleep and memory.',mcq('Which sentence avoids claiming causation?', ['Sleep causes every memory improvement.','The data suggest an association between sleep and memory.','Sleep proves the results.'],'The data suggest an association between sleep and memory.')),
  lesson('sc-l2','Methods and Passive Voice',4,'Sentence structure','Use the passive voice when the procedure matters more than the researcher. Use past tense for completed methods.','The samples were collected daily and stored at a constant temperature.',mcq('Complete: The samples ___ collected yesterday.',['is','were','will'],'were')),
 ],
 medical: [
  lesson('med-l1','Asking About Symptoms',2,'Naturalness','Ask clear, neutral questions about onset, location and duration. Do not assume the cause of a symptom.','When did the pain start? Where does it hurt?',mcq('Which question asks about the onset of a symptom?',['When did the pain start?','What is your address?','Would you like a receipt?'],'When did the pain start?')),
  lesson('med-l2','Explaining Next Steps Clearly',3,'Vocabulary','Use plain language and check understanding. Could you explain that in your own words? is a useful comprehension check.','We will check your blood pressure first. Could you tell me what will happen next?',mcq('Which phrase checks understanding respectfully?',['You understand everything, right?','Could you explain the next step in your own words?','There is no need to ask.'],'Could you explain the next step in your own words?')),
 ],
 travel: [
  lesson('tr-l1','Checking In at a Hotel',1,'Vocabulary','Use I have a reservation under... to give the name on a booking. Could I...? is a polite request.','I have a reservation under Ali. Could I check in, please?',mcq('How can you politely request check-in?',['Check me now.','Could I check in, please?','I checked yesterday tomorrow.'],'Could I check in, please?')),
  lesson('tr-l2','Asking for Directions',1,'Vocabulary','Use Where is...? for a place and How do I get to...? for directions. Turn left and go straight are common instructions.','How do I get to the station? Go straight, then turn left.',mcq('What does go straight mean?',['Continue forward.','Turn around.','Stop here.'],'Continue forward.')),
 ],
 meetings: [
  lesson('mt-l1','Agreeing and Disagreeing',2,'Naturalness','Acknowledge an idea before expressing a different view. Give a reason and offer a practical alternative.','I see your point, but we may need more time. Could we review it on Friday?',mcq('Which response disagrees politely?',['Your idea is stupid.','I see your point, but I have a concern about the timing.','No.'],'I see your point, but I have a concern about the timing.')),
  lesson('mt-l2','Clarifying Action Items',3,'Vocabulary','End a meeting by confirming the action, the person responsible and the deadline.','Sara will send the revised proposal by Thursday.',mcq('Which action item has an owner and a deadline?',['Someone should do something.','Sara will send the revised proposal by Thursday.','The proposal is interesting.'],'Sara will send the revised proposal by Thursday.')),
 ],
 presentations: [
  lesson('ps-l1','Signposting a Presentation',3,'Sentence structure','Tell listeners the order of your talk. Use first, next and finally to make transitions easy to follow.','First, I will explain the problem. Next, I will describe our approach. Finally, I will share the results.',mcq('Which word introduces the last section?',['First','Finally','Previously'],'Finally')),
  lesson('ps-l2','Answering Questions',4,'Naturalness','Acknowledge the question, give a direct answer and state uncertainty honestly. Offer to follow up when you lack evidence.','That is a useful question. We have not measured that yet, but I can follow up with the data.',mcq('What should you say when you lack the data?',['Invent a precise answer.','We have not measured that yet; I can follow up.','Ignore the question.'],'We have not measured that yet; I can follow up.')),
 ],
 interviews: [
  lesson('iv-l1','Using the STAR Structure',2,'Sentence structure','Explain Situation, Task, Action and Result. Focus on what you personally did and the outcome.','Our team was behind schedule. I organized daily reviews, and we delivered the project on time.',mcq('What does the R in STAR stand for?',['Reason','Result','Request'],'Result')),
  lesson('iv-l2','Discussing Strengths with Evidence',3,'Naturalness','Name a strength and support it with a specific example. Avoid claims that have no evidence.','I am organized: I created a shared tracker that helped our team meet three deadlines.',mcq('Which answer supports a strength with evidence?',['I am the best at everything.','I am organized: my shared tracker helped us meet three deadlines.','I have many strengths.'],'I am organized: my shared tracker helped us meet three deadlines.')),
 ],
 advanced: [
  lesson('adv-l1','Nuanced Opinions',4,'Naturalness','Use a concession to acknowledge a reasonable opposing point. Then state your view and explain the tradeoff.','Although the policy may reduce costs, it could limit access for smaller businesses.',mcq('Which word introduces a concession?',['Although','Therefore','Immediately'],'Although')),
  lesson('adv-l2','Calibrating Certainty',5,'Naturalness','Match your certainty to the evidence. Might indicates a possibility; is likely to indicates a stronger expectation.','The change might improve retention, although the available evidence is limited.',mcq('Which phrase expresses possibility rather than certainty?',['must always','might','is guaranteed to'],'might')),
 ],
};

export const authoredChecks = {
 'ev-l1':mcq('Which sentence correctly describes yesterday?',['I go to work yesterday.','I went to work yesterday.','I going work yesterday.'],'I went to work yesterday.'),
 'ev-l2':mcq('Which suggestion uses how about naturally?',['How about meeting at seven?','How about meeted at seven?','How about to meeting seven?'],'How about meeting at seven?'),
 'pr-l1':mcq('Which request is polite and specific?',['Send it!','Could you send the report by Friday, please?','Maybe things.'],'Could you send the report by Friday, please?'),
 'pr-l2':mcq('What does on track mean in a project update?',['Progressing as planned.','Stopped permanently.','Already cancelled.'],'Progressing as planned.'),
 'ac-l1':mcq('Which sentence acknowledges a counterargument?',['Remote work is good.','While remote work has benefits, it may reduce informal collaboration.','Work exists.'],'While remote work has benefits, it may reduce informal collaboration.'),
 'ac-l2':mcq('Which phrase is more suitable for an academic report?',['a really big thing','a substantial change','stuff happened'],'a substantial change'),
};
