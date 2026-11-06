/* Fixture CID 90102 — title-only Type, unnumbered trace line */
#include "logic_dead.h"

int logic_dead_compute(int x) {
  if (x < 0) {
    return -1;
  }
  return x + 1;
}
