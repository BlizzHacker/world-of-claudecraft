"""Smoke test + throughput benchmark: random agent playing the env from Python."""

import time

import numpy as np

from wow_env import WoWClassicEnv


def main() -> None:
    env = WoWClassicEnv(player_class="warrior", max_steps=2000)
    obs, info = env.reset(seed=42)
    print(f"obs shape: {obs.shape}, actions: {env.action_space.n}")
    print(f"action names: {env.action_names}")

    rng = np.random.default_rng(0)
    total_reward = 0.0
    n_steps = 20_000
    start = time.perf_counter()
    for _ in range(n_steps):
        action = int(rng.integers(env.action_space.n))
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        if terminated or truncated:
            obs, info = env.reset()
    elapsed = time.perf_counter() - start
    print(f"{n_steps} steps in {elapsed:.2f}s -> {n_steps / elapsed:,.0f} steps/sec (single env, incl. IPC)")
    print(f"total reward: {total_reward:.2f}, final info: {info}")
    env.close()


if __name__ == "__main__":
    main()
