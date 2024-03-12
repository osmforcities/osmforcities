import click
import geopandas as gpd
from pathlib import Path
from joblib import Parallel, delayed
from tqdm import tqdm
from glob import glob
from os import path
from itertools import chain
from shapely.geometry import box, mapping, MultiPolygon


def get_files(data_path: str):
    try:
        return list(glob(f"{data_path}/**/**/*.geojson"))
    except Exception as ex:
        print("data not found")
        print(ex)
        return []


def fix_name(name_: str):
    return (
        str(name_)
        .strip()
        .replace("  ", " ")
        .replace(" ", "-")
        .replace("_", "-")
        .lower()
    )


def get_filename_metadata(file_path: str):
    filename = path.basename(file_path)
    filename_clean = filename.split(".")[0]
    iso, level = filename_clean.split("_")
    return iso, level, filename, file_path


def generate_save_poly(coords_: list, file_path_: str, filename_: str):
    try:
        poly = [filename_]
        for i, boundary in enumerate(coords_):
            poly.append(f"area-{i + 1}")
            for lat, lng in boundary:
                poly.append(f"\t{lat}\t{lng}")
            poly.append("END")
        poly.append("END")
        poly_str = "\n".join(poly)

        with open(f"{file_path_}/{filename_}.poly", "w+") as src:
            src.write(poly_str)
            src.close()
    except Exception as ex:
        print("Error generate poly file")
        print(ex)


def process_poly_files(df_data: object, data_path: str, level_bbox: list):
    iso_code = df_data.iso_code
    level = df_data.level
    filename = df_data.filename
    bbox = [df_data.bbox]
    folder_path = f"{data_path}/{iso_code}/poly/{level}"
    Path(folder_path).mkdir(exist_ok=True, parents=True)
    if level in level_bbox:
        generate_save_poly(bbox, folder_path, f"{filename}__bbox")
    g = [i for i in df_data.geometry.geoms]
    coordinates = [mapping(geojson_ob)["coordinates"][0] for geojson_ob in g]
    generate_save_poly(coordinates, folder_path, f"{filename}__coords")
    return True


def merge_data(iso_code: str, iso_data: dict):
    try:
        gdf_group = {k: gpd.read_file(v.get("file_path")) for k, v in iso_data.items()}
        levels_order = list(sorted(iso_data.keys()))[::-1]
        # merge data
        for index, level in enumerate(levels_order):
            df = gdf_group.get(level)
            df["filename"] = df["shapeName"].apply(lambda x: fix_name(x))
            df["iso_code"] = iso_code
            df["level"] = level
            df["bbox"] = df.geometry.apply(
                lambda x: list(box(*list(x.bounds)).exterior.coords)
            )
            # convert polygon to multipolygon
            df["geometry"] = df["geometry"].apply(
                lambda x: x if x.geom_type == "MultiPolygon" else MultiPolygon([x])
            )
            # superior adm
            iterate_upper = levels_order[index + 1 : -1]
            if iterate_upper:
                df["polygeom"] = df["geometry"]
                # reproject centroid
                df["centroid"] = (
                    df["geometry"].to_crs(crs=32630).centroid.to_crs(crs=4326)
                )
                df["geometry"] = df["centroid"]
                for upper_level in iterate_upper:
                    upper_df = gdf_group.get(upper_level).copy()

                    colum_tmp = f"name_tmp_{upper_level}".lower()

                    upper_df[colum_tmp] = upper_df["shapeName"].apply(
                        lambda x: fix_name(x)
                    )
                    upper_df = upper_df[[colum_tmp, "geometry"]]

                    # merge
                    df = gpd.sjoin(df, upper_df, how="left")

                    df["filename"] = df.apply(
                        lambda x: f"{x[colum_tmp]}__{x['filename']}", axis=1
                    )
                df["geometry"] = df["polygeom"]

            gdf_group[level] = df[
                ["iso_code", "level", "filename", "bbox", "geometry"]
            ].copy()
        return gdf_group
    except Exception as ex:
        print(ex)
        return {}


@click.command("Generate poly files")
@click.option("--data_path", help="Data output path", type=str, default="./data")
@click.option(
    "--level_bbox",
    help="Level create bbox poly file",
    type=str,
    multiple=True,
    required=False,
)
def run(data_path, level_bbox):
    files = get_files(data_path)
    level_bbox = [i.upper().strip() for i in level_bbox]
    # check iso
    countries_data = {}
    for file_path_ in tqdm(files, desc="Group files"):
        iso, level, filename, file_path = get_filename_metadata(file_path_)
        if not countries_data.get(iso):
            countries_data[iso] = {}
        countries_data[iso][level] = {"filename": filename, "file_path": file_path}

    countries_data = Parallel(n_jobs=-1)(
        delayed(merge_data)(iso_code, iso_data)
        for iso_code, iso_data in tqdm(
            countries_data.items(), desc=f"Merge data for iso"
        )
    )
    # 2d to 1d
    countries_data = list(
        chain.from_iterable([list(i.values()) for i in countries_data])
    )

    for country_data in tqdm(countries_data, desc="Generate poly files"):
        country_data.apply(
            lambda x: process_poly_files(x, data_path, level_bbox), axis=1
        )


if __name__ == "__main__":
    run()
