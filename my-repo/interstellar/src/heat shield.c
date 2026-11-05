#include "nav_reader.h"

void heat_shield_arm(void)
{
    NavReader *reader = nav_active_reader();
    if (reader != NULL) {
        reader->status = 1;
    }
}
