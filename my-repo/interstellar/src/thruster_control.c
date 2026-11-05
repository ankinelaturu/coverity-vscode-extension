#include "nav_reader.h"
#include "thruster.h"

void thruster_apply_boost(void)
{
    NavReader *reader = nav_active_reader();
    reader->fuel_level -= 10;
}
