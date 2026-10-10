import importlib.util
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('guard',Path(__file__).with_name('guard_content_pool_reductions.py'))
mod=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(mod)

def test_count_list(): assert mod.count_records([1,2,3])==3
def test_count_map(): assert mod.count_records({'a':1,'b':2})==2
def test_count_question_object(): assert mod.count_records({'pyq':[1,2],'practice':[3]})==3
def test_empty_map_count_is_zero(): assert mod.count_records({})==0
