let
  pkgs = import (fetchTarball ("channel:nixpkgs-unstable")) { };
in
pkgs.mkShell {
  buildInputs = [ pkgs.nodejs pkgs.sqlite pkgs.openssl ];
  shellHook = ''
    export PRISMA_QUERY_ENGINE_BINARY=${pkgs.prisma-engines}/bin/query-engine
    export PRISMA_QUERY_ENGINE_LIBRARY=${pkgs.prisma-engines}/lib/libquery_engine.node
    export PRISMA_SCHEMA_ENGINE_BINARY=${pkgs.prisma-engines}/bin/schema-engine
  '';
}