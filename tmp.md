- now let the personas iterate like they are talking to each other in a meeting. this should update the requirements, the roadmap, the data model, the project structure and api conventions
- make a mvp meeting discussing all the mvp features from the roadmap with the relevant personas and split them into tasks and features that will be documented in ./junie/features where each taks/feature has its own md file. make it so that you can implement them file/feature by file/feature later

- localization persona 
- build on release
- log cleanup
- time tracking
- cleanup in general
- ip whitelisting for the whole service  (at infra level?)
- billing
- grafana dashboard for monitoring (logging table different types, rabbit mq dead letter etc)
- create a pre production checklist
- update readme and setup
- regular security check
- make rate limits customizable via .env if possible. discuss
- detailed grafana (alerts etc)
- github milestones
- lock main branch only allowed to merge PRs later
- add an architecture diagram
- automatic github / gitlab integration of a project (public and private) to reference commits in tickets

register who is allowed
organization planning and creation
send mail
seeding the db with user should not be done. only an admin user that can be configured via env should be set. should be deletable if there is another admin
+  description?: string | null;                                                                                                                                                                                                                                                                    
   33 +  color: string | null;                                                                                                                                                                                                                                                                           
   34 +  icon?: string | null;                                                                                                                                                                                                                                                                           
   35 +  taskCount?: number;                                                                                                                                                                                                                                                                             
   36 +  memberCount?: number;                                                                                                                                                                                                                                                                           
   37 +  members?: ProjectMember[];                                                                                                                                                                                                                                                                      
   38 +  statuses?: WorkflowStatus[];                                                                                                                                                                                                                                                                    
   39 +  labels?: Label[];  
+ evaluate field that the frontend expects but is not getting from the backend atm
task label definition for projects + priority label definitions
+ whenever request fails (e.g. rate limit) show an error notification bottom right with info about the respective function that was tried to do
+ smiley rendering in tiptap
+ grafana log searches
+ searching should only search tasks belonging to this org if you are not a super admin
+ let user select prefered mode (Dark vs light) prefered board type (board vs list) in the user settings page
- custom TOS and privacy