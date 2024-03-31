import { bridge } from "./BedrockBridge-main/BedrockBridg_Serverpack/development_behavior_packs/Bedrock-Bridge/scripts/definitions";
import { world, system, DynamicPropertiesDefinition } from "@minecraft/server";

//declare useful consts

const teamNamePrefix = "Esploratori:Teams/TeamName:";
const waitingToJoinTeamPrefix = "Esploratori:Teams/WaitingToJoin:";
const approvedTeamsRequestPrefix = "Esploratori:Teams/Approved:";

//utility funcs

function getPlayersIn(team) {
  return world.getPlayers.filter((player) => {
    if (player.getTags.includes(teamNamePrefix + team)) {
      return true;
    } else {
      return false;
    }
  });
}

function GetTeamTags(tags) {
  return tags.filter((tag) => {
    if (item.startsWith(teamNamePrefix)) {
      return true;
    } else {
      return false;
    }
  });
}

function getAllTeams() {
  //  Get all team tags
  let allTeams = [];
  world.getPlayers.ForEach((player) => {
    allTeams.push(GetTeamTags(player.getTags()));
  });
  //  filter out dupes
  allTeams = allTeams.filter((value, index, array) => {
    if (array.slice(index).findIndex(value) >= 0) {
      return false;
    } else {
      return true;
    }
  });
  return allTeams;
}

//single use callbacks

function checkTeamAcceptance() {
  world.getPlayers().ForEach((player) => {
    let requestingTags = player.getTags().filter((tag) => {
      tag.startsWith(waitingToJoinTeamPrefix);
    });
    let BoolAccepted;
    // check if the player has a request in their requesting tags
    if (requestingTags.length > 0) {
      let requestedTeam = getPlayersIn(
        requestingTags[0].slice(waitingToJoinTeamPrefix.length)
      );
      //if the player does check to see if thier whole teasm has accepted it
      BoolAccepted =
        requestedTeam.some((Member) =>
          Member.getTags().includes(approvedTeamsRequestPrefix + "true")
        ) &&
        requestedTeam.every(
          (Member) =>
            Member.getTags().findIndex(approvedTeamsRequestPrefix + "false") !==
            -1
        );
    }
    //if the player was accepted remove them from their previous team and add them to their new team
    if (BoolAccepted) {
      player.removeTag(GetTeamTags(player));
      player.removeTag(requestingTags[0]);
      player.addTag(teamNamePrefix + requestedTeam);
      player.sendMessage(`You have been accepted into team ${requestedTeam}`);
    }
    //if anyone denied the request remove the request tags from all players
    if (
      !BoolAccepted &&
      requestedTeam.some((Member) =>
        Member.getTags().includes(approvedTeamsRequestPrefix + "true")
      )
    ) {
      requestedTeam.ForEach((member) => {
        member.removeTag(
          member.getTags().filter((tag) => {
            return tag.startsWith(approvedTeamsRequestPrefix);
          })
        );
      });
      player.removeTag(requestingTags[0]);
    }
  });
}

// declare registered funcs

function createTeam(executor, ...params) {
  let tags = player.getTags();

  //make sure that the player correctly entered their team name
  if (params.length > 1) {
    executor.sendMessage(
      'please provide the team name as either a single argument, with no spaces, or as a string enclosed in double " quotes'
    );
    return;
  }

  //clear tags from other teams
  if (GetTeamTags(tags).length > 0) {
    GetTeamTags(tags).ForEach((tag) => {
      executor.removeTag(tag);
    });
  }

  //check to make sure the team doesn't already exist
  //  Get all team tags

  let allTeams = getAllTeams();

  //  verify that the new teams name is unique
  if (allTeams.includes(teamNamePrefix + params[0])) {
    executor.sendMessage("you cannot create a team that already exists");
    return;
  }

  //register the player as a member of the team
  executor.addTag(teamNamePrefix + params[0]);
  executor.sendMessage(`you have created the team: ${params[0]}`);
}

function ListTeams(executor, ...params) {
  let allTeams = getAllTeams();
  let allTeamNames = allTeams.map((tag) => {
    return tag.slice(teamNamePrefix.length);
  });
  //Build return message

  let returnMessage = `There are currently ${allTeams.length} teams online /n these teams are:`;
  for (let x = 0; x < allTeamNames.length; x++) {
    returnMessage =
      returnMessage + "/n" + toString(x + 1) + ") " + allTeamNames[x];
  }

  //return the message

  executor.sendMessage(returnMessage);
}

function JoinTeam(executor, ...params) {
  let allTeams = getAllTeams();

  //make sure that the player correctly entered their team name
  if (params.length > 1) {
    player.sendMessage(
      'please provide the team name as either a single argument, with no spaces, or as a string enclosed in double " quotes'
    );
    return;
  }

  //verify that the team exists
  if (!allTeams.includes(teamNamePrefix + params[0])) {
    player.sendMessage(
      "You cannot join a team that does not exist, please either create a team with !CreateTeam or veiw a lsit of all teams with !ListTeams "
    );
    return;
  }

  //verify that the team has no other requests
  if (
    !getPlayersIn(params[0]).every((player) => {
      return (
        player.getTags().filter((tag) => {
          return tag.startsWith(approvedTeamsRequestPrefix);
        }) > 0
      );
    })
  ) {
    executor.sendMessage(
      "You cannot join this team right now, someone else is attempting to"
    );
    return;
  }

  //send a join request to the team
  executor.addTag(waitingToJoinTeamPrefix + params[0]);
  getPlayersIn(params[0]).ForEach((player) => {
    player.removeTag(approvedTeamsRequestPrefix + "submitted");
    player.sendMessage(
      `${executor.name} has requested to join your team, use '!TeamsRequest approve' to accept them, or '!TeamsRequest deny' if you do not wish them to join`
    );

    //wait for them to accepted or denied then add them to the team or don't
    system.runTimeout(checkTeamAcceptance, 600);
  });
}

function TeamsRequest(executor, ...params) {
  if (params[0] === "deny") {
    executor.addTag(approvedTeamsRequestPrefix + "false");
  } else if (params[0] === "approve") {
    executor.addTag(approvedTeamsRequestPrefix + "true");
  } else {
    executor.sendMessage(
      'that is invalidly formated, please use "!TeamsRequest approve" or "!TeamsRequest deny"'
    );
  }
}

//register functions

bridge.bedrockCommands.registerCommand(
  "CreateTeam",
  createTeam,
  "Creates a team, with you as the leader"
);

bridge.bedrockCommands.registerCommand(
  "JoinTeam",
  JoinTeam,
  "allows you to join as team bye endtering its name"
);

bridge.bedrockCommands.registerCommand(
  "listTeams",
  ListTeams,
  "shows the names of all teams on chat"
);

bridge.bedrockCommands.registerCommand(
  "TeamsRequest",
  TeamsRequest,
  "allows you to accept or deny a request to join your team"
);
