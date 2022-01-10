import { DviCommand, merge } from "../parser.ts";
import { Machine } from "../machine.ts";

class XimeraBegin extends DviCommand {
  environment: string;

  constructor(environment: string) {
    super({});
    this.environment = environment;
  }

  execute(machine: Machine) {
    machine.pushXimera(this.environment);
  }

  toString(): string {
    return `pushXimera { environment: '${this.environment}' }`;
  }
}

class XimeraEnd extends DviCommand {
  environment: string;

  constructor(environment: string) {
    super({});
    this.environment = environment;
  }

  execute(machine: Machine) {
    machine.popXimera();
  }

  toString(): string {
    return `popXimera { }`;
  }
}

class XimeraRule extends DviCommand {
  rule: string;

  constructor(rule: string) {
    super({});
    this.rule = rule;
  }

  execute(machine: Machine) {
    machine.setXimeraRule(this.rule);
  }

  toString(): string {
    return `setXimeraRule { rule: '${this.rule}' }`;
  }
}

class XimeraRuleClose extends DviCommand {
  constructor() {
    super({});
  }

  execute(machine: Machine) {
    machine.setXimeraRuleClose();
  }

  toString(): string {
    return `setXimeraRuleClose { }`;
  }
}

class XimeraRuleOpen extends DviCommand {
  rule: string;

  constructor(rule: string) {
    super({});
    this.rule = rule;
  }

  execute(machine: Machine) {
    machine.setXimeraRuleOpen(this.rule);
  }

  toString(): string {
    return `setXimeraRuleOpen { rule: '${this.rule}' }`;
  }
}

class XimeraSave extends DviCommand {
  constructor() {
    super({});
  }

  execute(machine: Machine) {
    machine.savedPosition = machine.position;
  }
}

class XimeraRestore extends DviCommand {
  constructor() {
    super({});
  }

  execute(machine: Machine) {
    // machine.position = machine.savedPosition;
  }
}

function* specialsToXimera(commands) {
  for (const command of commands) {
    if (!command.special) {
      yield command;
    } else {
      if (!command.x.startsWith("ximera:")) {
        yield command;
      } else {
        if (command.x.startsWith("ximera:rule ")) {
          let ximera = command.x.replace(/^ximera:rule /, "");
          yield new XimeraRule(ximera);
        } else if (command.x.startsWith("ximera:rule:open ")) {
          let ximera = command.x.replace(/^ximera:rule:open /, "");
          yield new XimeraRuleOpen(ximera);
        } else if (command.x.startsWith("ximera:rule:close ")) {
          yield new XimeraRuleClose();
        } else if (command.x.startsWith("ximera:begin ")) {
          let ximera = command.x.replace(/^ximera:begin /, "");
          yield new XimeraBegin(ximera);
        } else if (command.x.startsWith("ximera:end ")) {
          let ximera = command.x.replace(/^ximera:end /, "");
          yield new XimeraEnd(ximera);
        } else if (command.x === "ximera:save") {
          yield new XimeraSave();
        } else if (command.x === "ximera:restore") {
          yield new XimeraRestore();
        } else {
          yield command;
        }
      }
    }
  }
}

export default function (commands) {
  return specialsToXimera(commands);
}
