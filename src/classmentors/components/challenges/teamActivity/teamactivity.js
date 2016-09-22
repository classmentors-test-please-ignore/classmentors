import teamActivityCreateTmpl from './team-view-create.html!text';
import teamIRATTmpl from './teamactivity-view-irat-start.html!text';
import teamTRATTmpl from './teamactivity-view-trat-start.html!text';
import teamFormationTmpl from './teamactivity-view-teamFormation.html!text';
import './teamActivity.css!';

function createTeamActivityInitialData($q, eventService, clmDataStore) {
    var data = eventService.get();
    console.log("team data is:", data);

    return clmDataStore.events.participants(data.event.$id).then (
        function (result){
            return{
                data: data,
                participants: result
            }
        }
    )
}
createTeamActivityInitialData.$inject = ['$q', 'eventService', 'clmDataStore'];

function createTeamActivityController($q, initialData, clmDataStore, $location, urlFor,eventService){
    var self = this;

    console.log("initialdata are",initialData);
    // event variable consist of event id,timecreated,owner and event title
    self.event = initialData.data.event;

    //task variable consist of description,title of task, showProgress, priority, archived(t/f)
    self.task = initialData.data.task;

    self.taskType = initialData.data.taskType;

    self.participants = initialData.participants;
    self.teamsMaximumStudents = 0;
    self.taskType = initialData.data.taskType;
    self.activityType = null;
    self.newExistingTeams = null;
    self.teamFormationMethod = null;
    self.teamFormationParameter = null;

    
    self.submit = function(){
        self.task.activityType = self.activityType;
        self.task.newExistingTeams = self.newExistingTeams;
        self.task.teamFormationMethod = self.teamFormationMethod;
        self.task.teamFormationParameter = self.teamFormationParameter;
        self.task.startIRAT = true;
        self.event.teams = formTeams(self.teamFormationMethod, self.teamFormationParameter, self.participants.length);
        eventService.set({
            taskType: self.taskType,
            event: self.event,
            task: self.task,
            isOpen: initialData.data.isOpen
        })
        $location.path(urlFor('viewMcq'));
    }


    function formTeams(method, methodParameter, participants){
        var teams = [];
        var teamStructure = [];
        console.log('Total participants :', participants );
        if(method == 'noOfTeams'){
          //initialze teamStructure with team size of 0 each
          for(var i = 0; i < methodParameter; i++){
            teamStructure.push(0);
          }
          console.log('Line reaches here');
          console.log('teamStructure :', teamStructure);
          //add 1 to each team until there are no more participants left
          for(var i = 0; i < participants; i ++){
            teamStructure[i % methodParameter] += 1;
          }
        }else{//else by teamSize
           while (participants > methodParameter) {
             teamStructure.push(methodParameter);
             participants -= methodParameter;
           }
           // split up remaining participants
           for(var i = 0; i < participants; i ++){
             teamStructure[i % teamStructure.length] += 1;
           }
        }
        //Create 'teams'
        for(var i = 0; i < teamStructure.length; i ++){
          // teams[i] = populateTeam(teamStructure[i]);
          teams.push({
            maxSize: teamStructure[i],
            currentSize: 0
          });
        }
        console.log('Teams is: ', teams);
        return teams;
    }

    function populateTeam(members){
        var team = {}
        console.log(members);
        for(var i = 0; i < members; i++){
            team[i] = "";
        }
        console.log(angular.toJson(team));
        return team;
    }
    // if number of teams, "Each team will have a maximum enrollment of # students"; #= roundup (totalParticipants / # of teams)
    // if max number of student, "You will have # teams"; #= round up (totalParticipants / # stud per team)
    self.calculateTeamMaximumStudent = function (noTeamsOrStudents){
        // var noTeamsOrStudents = self.teamFormationInput;
        var totalParticipants = self.participants.length;

        console.log("number is ", noTeamsOrStudents);
        console.log("cal", Math.ceil(totalParticipants / noTeamsOrStudents) );
        self.teamsMaximumStudents = Math.ceil(totalParticipants / noTeamsOrStudents) ? Math.ceil(totalParticipants / noTeamsOrStudents):0 ;

    }

    self.calculationResult = function (){
        
        return self.teamsMaximumStudents;
    }

}
createTeamActivityController.$inject = [
    '$q', 
    'initialData', 
    'clmDataStore',
    '$location',
    'urlFor',
    'eventService'
    ];

function startTRATInitialData($q, spfAuthData, eventService, clmDataStore, firebaseApp, $firebaseObject, $firebaseArray){
    /*
    TODO:
    1. Load Teams
    2. Load Team Log
    3. Load Answers [done]
    */
    var data =  eventService.get();
    var db = firebaseApp.database();
    
    console.log("my data is:", data);
    var eventId = data.eventId;
    var taskId = data.taskId;
    // var teamLogPromise = null;
    var tratId = taskId;
    var userTeamId = null;
    var userPublicId = data.participant.$id;
    var teamFormationRefKey = data.task.teamFormationRef;
    var eventTeamRef = db.ref(`classMentors/eventTeams/${eventId}/${teamFormationRefKey}`);

    // Get user's teamId
    // $firebaseArray(eventTeamRef).$loaded()
    //     .then(function(teams){
    //         // Sanity check that teams are retrieved
    //         console.log(teams);
    //         for(var i = 0; i < teams.length; i ++){
    //             var team = teams[i];
    //             if(team[userPublicId]){
    //                 userTeamId = team.$id
    //             }
    //         }})
    //     .then(getTeamLog(userTeamId));
    // function getTeamLog(teamId){
    //     var eventTeamsLogRef = db.ref(`classMentors/eventTeamsLog/${eventId}/${teamId}`);
    //     teamLogPromise = $firebaseObject(eventTeamsLogRef).$loaded();
    // }

    
    return $q.all({
        currentUser: spfAuthData.user(),
        correctAnswers: clmDataStore.events.getTaskAnswers(data.eventId, data.task.taskFrom)
            .then(function(data){return data.$value}),
        progress: clmDataStore.events.getProgress(data.eventId).then(function(data){return data}),
        questions: angular.fromJson(data.task.mcqQuestions),
        tratId: tratId,
        teamAndteamId: $firebaseArray(eventTeamRef).$loaded()
        .then(function(teams){
            // Sanity check that teams are retrieved
            console.log(teams);
            for(var i = 0; i < teams.length; i ++){
                var team = teams[i];
                if(team[userPublicId]){
                    return team.$id;
                }
            }}).then(function(teamId){
                var teamRef = db.ref(`classMentors/eventTeams/${eventId}/${teamFormationRefKey}/${teamId}`);
                
                return {
                    team: $firebaseArray(teamRef).$loaded()
                        .then(function(team){
                            var outputTeam = []
                            for(var i = 0; i < team.length; i++){
                                var idAtIdx = team[i].$id;
                                if(idAtIdx != 'currentSize' && idAtIdx != 'maxSize'){
                                    outputTeam.push(team[i]);
                                }
                            }
                            return outputTeam;
                        }),
                    teamId:teamId
                }
            }),
        eventId: eventId,
        teamFormId: teamFormationRefKey
    });

    // return $q.all ({
    //     currentUser: spfAuthData.user(),
    //     correctAnswers: clmDataStore.events.getTaskAnswers(data.eventId, data.task.taskFrom),
    //     progress: clmDataStore.events.getProgress(data.eventId),
    //     questions: null,
    //     teamLog: null,
    //     tratId: null,
    //     teamId: null,

    // }).then (function (result){
    //     return {
    //         data: data,
    //         correctAnswers: result.answers,
    //         currentUser: result.currentUser,
    //         progress: result.getProgress
    //     }
    // });
    

}
startTRATInitialData.$inject = ['$q','spfAuthData', 'eventService','clmDataStore', 'firebaseApp', '$firebaseObject', '$firebaseArray'];

function startTRATController($q, initialData, clmDataStore, $location, urlFor,
        firebaseApp, $firebaseObject, $firebaseArray, spfAlert){
    
    // Sanity check
    console.log('Initial data contains: ', initialData);
    var self = this;
    var db = firebaseApp.database();
    self.index = 0;
    
    // Inititalize Question and Question's option(s)
    self.questions = initialData.questions; 
    self.question = self.questions[self.index];
    self.options = self.question.options;
    var userPublicId = initialData.currentUser.publicId;
    console.log(initialData.currentUser);
    self.eventId = initialData.eventId;
    var teamAndteamId = initialData.teamAndteamId;
    self.teamId = teamAndteamId.teamId;
    self.team = null;
    teamAndteamId.team.then(function(result){self.team = result}); 
    self.tratId = initialData.tratId;
    self.teamFormId = initialData.teamFormId;
    var answers = [];
    self.multiAns = [];
    self.correctAnswers = angular.fromJson(initialData.correctAnswers);
    var teamLogRef = db.ref(`classMentors/eventTeamsLog/${self.teamFormId}/${self.teamId}`);
    self.multipleAns = (function(){
        var multipleAnsArray = [];
        for(var i = 0; i < self.correctAnswers.length; i ++){
            var ans = self.correctAnswers[i];
            if(ans.length > 1){
                multipleAnsArray.push(true);
            }else{
                multipleAnsArray.push(false);
            }
        }
        console.log('Sanity check: ', multipleAnsArray);
        return multipleAnsArray;
    })();
    console.log(self.multipleAns);  

    // Will this overwrite the reference when called by other clients?
    var teamAnsRef = db.ref(`classMentors/eventSolutions/${self.eventId}/${self.teamId}/${self.tratId}`);
    // teamAnsRef.set('init');
    
    //Init team log
    self.teamLog = null;
    function refreshLog(){
        $firebaseArray(teamLogRef.orderByKey()).$loaded(function(data){
            self.teamLog = data;
        });
    }
    refreshLog();
    // $firebaseArray(teamLogRef)
    //     .$loaded(function(data){
    //         console.log(data);
    //     });

    // test this later
    var updateLog = function(msg){
        teamLogRef.push().set(msg).then(function(){
            console.log('Msg has been pushed');
            refreshLog();
        });
    }

    self.submitTrat = function(){
        $location.path(urlFor('oneEvent'));
    }

    self.onChange = function(){
        var msg = {
            user: userPublicId,
            text: 'Selected: ' + self.options[self.selected].text,
            selected: self.selected
        }
        updateLog(msg);
    }
    
    function teamAns(answer){
        // Check which user`s answer is used for submission.
        var userIdx = self.index % self.team.length;
        console.log(userIdx);
        console.log(self.team);
        var selectedUserPubId = self.team[userIdx].$id
        // Check if current user is selected.
        if(selectedUserPubId == userPublicId){
            var submission = {
                submitBy: userPublicId,
                answer: angular.toJson(answer)
            }
            teamAnsRef.push(submission);
        }
        
        // Submit answer
        // Optional: Add to log; The next user who`s answer will be submited next.
    }

    self.nextQuestion = function(){
        console.log("next question has been clicked");
        // Check if all members have submit
        // Check if user's answers is the answer that will be saved under team record.
        // 
        if(self.selected != null){
            var tempArray = []
            tempArray.push(self.selected);
            answers.push(tempArray);
            teamAns(tempArray);
        }else{// Multi-ans questions
            answers.push(multiAns);
            teamAns(multiAns);
            multiAns = [];
            
        }
        if(self.index + 1 < self.questions.length){
            self.index += 1;
            self.question = self.questions[self.index];
            self.options = self.question.options;
        }else{
            console.log('Submitted Ans for last question.. ending TRAT');
            console.log(answers);
            // Mark indiv
            // Mark team
            spfAlert.success('TRAT Submitted');
            var indivScore = markQuestions(answers);
            console.log(indivScore);
            // $location.path(urlFor('oneEvent', {eventId: event.$id}));

        }

    }
    function arraysEqual(arr1, arr2) {
        if(arr1.length !== arr2.length)
        return 0;
        for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return 0;
        }
        return 1;
    }

    self.toggle = function(list, item){
        console.log(list);
        var idx = list.indexOf(item);
        if (idx > -1) {
            list.splice(idx, 1);
        }else {
            list.push(item);
        }
        var selected = [];
        for(var i = 0; i < list.length; i++){
            var text = self.options[list[i]].text;
            selected.push(text);
        }
        var msg = {
            user: userPublicId,
            text: 'Selected: ' + selected,
            selected: list
        }
        updateLog(msg);
    }

    function markQuestions(submittedAnswers){
        console.log('Correct Answers...', self.correctAnswers);
        console.log('Submitted Answers...', submittedAnswers);
        var score = 0;
        for(var i = 0; i < submittedAnswers.length; i ++){
            score += arraysEqual(submittedAnswers[i], self.correctAnswers[i]);
        }
        return score;
    }

    function markTeam(){
            //   saveScore: function(eventId, publicId, taskId, score) {

    }

}

startTRATController.$inject = [
    '$q',
    'initialData',
    'clmDataStore',
    '$location',
    'urlFor',
    'firebaseApp',
    '$firebaseObject',
    '$firebaseArray',
    'spfAlert'
]


// Export
export {
    teamActivityCreateTmpl,
    createTeamActivityInitialData,
    createTeamActivityController,
    teamIRATTmpl,
    startTRATController,
    teamTRATTmpl,
    teamFormationTmpl,
    startTRATInitialData

};
// startIRATController,
// export function teamActivityCreateView(){
//   return teamActivityCreateTmpl;
// }
