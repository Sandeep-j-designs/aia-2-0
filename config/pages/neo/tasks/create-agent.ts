import { getState } from "@/components/inbox/v2/store";
import { AGENT_RECIPES, TRIGGER_LABEL } from "@/config/pages/neo/mock-agents";
import {
  agentByName,
  agentByRecipe,
  saveAgent,
} from "@/hooks/pages/neo/use-agents";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import type { NeoAgent, NeoAgentTrigger } from "@/types/pages/neo/agents";
import { has } from "@/utils/pages/neo";

const TRIGGERS: NeoAgentTrigger[] = [
  "bill-uploaded",
  "daily",
  "weekly",
  "monthly",
];

const AGENTS_HREF = "/inbox?module=NEO&page=agents";

/**
 * Neo › Agents: set up a standing agent in a conversation — what it does,
 * when it runs and how far it may go — then sign it off on one card. Saving
 * as a draft keeps it from running; turning it on schedules it. An agent
 * flags or prepares drafts; it never approves.
 *
 * "Edit agent <name>" opens an agent already saved, straight at its card.
 */
const createAgent: NeoTask = {
  id: "create-agent",
  title: "Set up an agent",
  match: (p) =>
    has(p, /\b(create|new|set ?up|build|make)\b.*\bagents?\b/i) ||
    has(p, /^(edit|open) agent\b/i)
      ? 20
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const p = api.prompt.toLowerCase();
    const editName = api.prompt.match(/^(?:edit|open) agent\s+(.+)$/i)?.[1];
    const existing = editName
      ? agentByName(company, editName.trim())
      : undefined;

    let agent: NeoAgent;
    if (existing) {
      agent = existing;
    } else {
      let recipe = AGENT_RECIPES.find(
        (r) =>
          p.includes(r.name.toLowerCase()) ||
          p.includes(r.agentName.toLowerCase())
      );
      if (!recipe) {
        const pick = await api.ask(
          "What should the agent do?",
          AGENT_RECIPES.map((r) => ({
            id: r.id,
            label: r.name,
            hint: r.description,
          }))
        );
        recipe = AGENT_RECIPES.find((r) => r.id === pick)!;
      } else {
        await api.say(
          `Setting up "${recipe.agentName}". ${recipe.description}`
        );
      }
      const trigger = (await api.ask(
        "When should it run?",
        TRIGGERS.map((t) => ({
          id: t,
          label: TRIGGER_LABEL[t],
          hint: t === recipe!.trigger ? "Suggested for this agent" : undefined,
        }))
      )) as NeoAgentTrigger;
      const permission = (await api.ask("How far may it go?", [
        {
          id: "flag",
          label: "Flag what it finds",
          hint: "Nothing changes in your books",
        },
        {
          id: "draft",
          label: "Prepare drafts as well",
          hint: "Drafts wait in Need review for your approval",
        },
      ])) as NeoAgent["permission"];
      // One agent per recipe: making it again changes the one you have.
      const same = agentByRecipe(company, recipe.id);
      if (same)
        await api.say(
          `You already have ${same.name}; I'll update it rather than add a second one.`
        );
      agent = {
        ...same,
        id: same?.id ?? `${company}-agent-${recipe.id}`,
        company,
        name: same?.name ?? recipe.agentName,
        description: recipe.description,
        status: same?.status ?? "draft",
        trigger,
        permission,
        recipeId: recipe.id,
        checks: recipe.checks,
      };
    }

    const card = (
      state: Extract<NeoCard, { kind: "agent" }>["state"]
    ): NeoCard => ({
      kind: "agent",
      agentId: agent.id,
      name: agent.name,
      description: agent.description,
      trigger: TRIGGER_LABEL[agent.trigger],
      permission: agent.permission,
      checks: agent.checks,
      state,
    });

    const choice = await api.card(card("Preview"), [
      { id: "on", label: "Turn on", primary: true },
      { id: "draft", label: "Save as draft" },
      { id: "cancel", label: existing ? "Close" : "Not now" },
    ]);
    if (choice === "cancel") {
      await api.say(
        existing ? "Left it as it was." : "Nothing saved. Ask again any time."
      );
      return "Nothing saved";
    }
    const status = choice === "on" ? "scheduled" : "draft";
    saveAgent({ ...agent, status });
    api.updateCard(
      card(status === "scheduled" ? "Scheduled" : "Saved as draft")
    );
    await api.say(
      status === "scheduled"
        ? `${agent.name} is on. It runs ${TRIGGER_LABEL[agent.trigger].toLowerCase()} and puts what it finds in Needs attention; nothing is approved without you.`
        : `${agent.name} is saved as a draft. It won't run until you turn it on.`,
      [{ label: "Open Agents", href: AGENTS_HREF }]
    );
    return status === "scheduled"
      ? `${agent.name} turned on`
      : `${agent.name} saved as draft`;
  },
};

export default createAgent;
