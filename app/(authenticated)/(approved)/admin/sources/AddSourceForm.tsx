"use client";

import type { SourceFormState } from "./validation";
import { useActionState } from "react";
import { addSource } from "./actions";
import { SOURCE_TIERS, SOURCE_TYPES } from "./validation";

const initialState: SourceFormState = {};

export default function AddSourceForm() {
  const [state, formAction, isPending] = useActionState(
    addSource,
    initialState,
  );

  return (
    <form action={formAction}>
      <h2>Add a source</h2>
      <p>
        <label>
          Name{" "}
          <input
            name="name"
            defaultValue={state.fields?.name}
            maxLength={255}
            required
          />
        </label>
        {state.errors?.name}
      </p>
      <p>
        <label>
          Tier{" "}
          <select
            key={state.fields?.tier}
            name="tier"
            defaultValue={state.fields?.tier ?? ""}
            required
          >
            <option value="" disabled>
              Choose a tier
            </option>
            {SOURCE_TIERS.map(tier => (
              <option key={tier}>{tier}</option>
            ))}
          </select>
        </label>
        {state.errors?.tier}
      </p>
      <p>
        <label>
          Type{" "}
          <select
            key={state.fields?.type}
            name="type"
            defaultValue={state.fields?.type ?? ""}
            required
          >
            <option value="" disabled>
              Choose a type
            </option>
            {SOURCE_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        {state.errors?.type}
      </p>
      <p>
        <label>
          URL{" "}
          <input
            name="url"
            defaultValue={state.fields?.url}
            placeholder="example.com"
            required
          />
        </label>
        {state.errors?.url}
      </p>
      <button type="submit" disabled={isPending}>
        Add source
      </button>
      {state.inactiveMatch && (
        <p>
          This URL belongs to &quot;{state.inactiveMatch.name}&quot;, which is
          inactive.{" "}
          <button
            type="submit"
            name="reactivateId"
            value={state.inactiveMatch.sourceId}
            disabled={isPending}
            formNoValidate
          >
            Reactivate it
          </button>
        </p>
      )}
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
