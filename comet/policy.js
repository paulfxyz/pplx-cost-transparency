/* Pure policy planning plus a Node.js stdin adapter.
 * No file writes, network requests, browser automation or privilege escalation.
 * MIT License */

function policyObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(name + " must be a dictionary. No change was made.");
  }
  return value;
}

function validExtensionId(id) {
  if (typeof id !== "string" || !/^[a-p]{32}$/.test(id)) {
    throw new Error("Use a 32-letter Chrome extension ID (a-p), never a wildcard.");
  }
  return id;
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + canonical(value[key]);
    }).join(",") + "}";
  }
  return JSON.stringify(value);
}

function scopedRule() {
  return {
    runtime_allowed_hosts: ["https://perplexity.ai", "https://www.perplexity.ai"],
    runtime_blocked_hosts: [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildPolicyPlan(request) {
  policyObject(request, "Request");
  var action = request.action;
  var id = validExtensionId(request.id);
  var wasAbsent = request.policy === null;
  var policy = wasAbsent ? {} : clone(policyObject(request.policy, "Policy"));
  var hadSettings = own(policy, "ExtensionSettings");
  var settings = hadSettings
    ? policyObject(policy.ExtensionSettings, "ExtensionSettings")
    : {};
  var rule = scopedRule();
  var matches = own(settings, id) && canonical(settings[id]) === canonical(rule);

  if (action === "status") {
    return {
      changed: false,
      configured: !!matches,
      summary: matches
        ? "This extension has the exact two-host policy exception."
        : (own(settings, id)
          ? "An extension-specific policy exists, but it is not this helper's exact scoped rule."
          : "This extension has no explicit scoped policy entry."),
      changes: { extensionId: id, expectedRule: rule },
    };
  }

  if (action === "apply" || action === "migrate") {
    var from = action === "migrate" ? validExtensionId(request.from) : null;
    if (from === id) throw new Error("Old and new extension IDs must differ.");
    if (action === "apply" && matches) {
      return {
        changed: false,
        summary: "Already configured. No policy or recovery record was changed.",
        changes: { extensionId: id, expectedRule: rule },
      };
    }
    if (own(settings, id)) {
      throw new Error("A policy already exists for the target ID. It will not be overwritten.");
    }
    if (from && (!own(settings, from) || canonical(settings[from]) !== canonical(rule))) {
      throw new Error("The old ID does not have exactly this two-host rule. Ask your administrator to review it.");
    }
    var record = {
      format: 1,
      action: action,
      extensionId: id,
      fromExtensionId: from,
      createdPolicy: wasAbsent,
      createdExtensionSettings: !hadSettings,
      appliedRule: clone(rule),
    };
    if (from) delete settings[from];
    settings[id] = clone(rule);
    policy.ExtensionSettings = settings;
    return {
      changed: true,
      removePolicy: false,
      policy: policy,
      record: record,
      summary: from
        ? "Replace only the old extension's scoped exception with the new ID's exception."
        : "Add an exception for only this extension and the two HTTPS Perplexity hosts.",
      changes: { removeExtensionId: from, allowExtensionId: id, rule: rule },
    };
  }

  if (action !== "undo") throw new Error("Unknown action.");
  var record = policyObject(request.record, "Recovery record");
  if (record.format !== 1 || record.extensionId !== id ||
      (record.action !== "apply" && record.action !== "migrate") ||
      typeof record.createdPolicy !== "boolean" ||
      typeof record.createdExtensionSettings !== "boolean" ||
      canonical(record.appliedRule) !== canonical(rule)) {
    throw new Error("The recovery record is invalid or belongs to another setup.");
  }
  if (!matches) {
    throw new Error("This extension's policy is missing or has changed. Undo will not overwrite administrator changes.");
  }
  var restore = record.action === "migrate"
    ? validExtensionId(record.fromExtensionId)
    : null;
  if (restore === id) throw new Error("Invalid migration recovery record.");
  if (restore && own(settings, restore) && canonical(settings[restore]) !== canonical(rule)) {
    throw new Error("The old ID now has a different policy. Undo will not overwrite it.");
  }
  delete settings[id];
  if (restore) settings[restore] = clone(rule);
  if (!Object.keys(settings).length && record.createdExtensionSettings) {
    delete policy.ExtensionSettings;
  } else {
    policy.ExtensionSettings = settings;
  }
  return {
    changed: true,
    removePolicy: record.createdPolicy && Object.keys(policy).length === 0,
    policy: policy,
    summary: restore
      ? "Remove the new ID's exception and restore the old ID's same scoped exception."
      : "Remove only the exception added by this helper, preserving unrelated current policies.",
    changes: { removeExtensionId: id, restoreExtensionId: restore },
  };
}

// Policy data stays on stdin/private temporary files, not process arguments.
if (typeof module === "object" && module.exports) {
  module.exports = { buildPolicyPlan: buildPolicyPlan };
  if (require.main === module) {
    try {
      var input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
      var mode = process.argv[2] || "plan";
      var result;
      if (mode === "plan") {
        result = JSON.stringify(buildPolicyPlan(input));
      } else if (mode === "field") {
        var field = process.argv[3];
        if (["summary", "changes", "changed", "removePolicy", "policy", "record"].indexOf(field) < 0 ||
            !own(input, field)) throw new Error("Missing or unsupported plan field.");
        result = typeof input[field] === "string" ? input[field] : JSON.stringify(input[field]);
      } else {
        throw new Error("Unknown engine mode.");
      }
      process.stdout.write(result + "\n");
    } catch (error) {
      process.stderr.write("Policy check failed: " + error.message + "\n");
      process.exitCode = 1;
    }
  }
}
